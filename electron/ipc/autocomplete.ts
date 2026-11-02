import { ipcMain } from 'electron'
import { SETTINGS_FILE, CREDENTIALS_FILE } from '../constants'
import { safeStorage } from 'electron'
import { existsSync, readFileSync } from 'fs'

let activeCompletionController: AbortController | null = null
const completionCache = new Map<string, string>()

function resolveApiKey(apiKeyRef: string | null): string | null {
  if (!apiKeyRef) return null
  try {
    if (!existsSync(CREDENTIALS_FILE)) return null
    const creds = JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf-8'))
    const stored = creds[apiKeyRef]
    if (!stored) return null
    if (!safeStorage.isEncryptionAvailable()) {
      return Buffer.from(stored, 'base64').toString('utf-8')
    }
    return safeStorage.decryptString(Buffer.from(stored, 'base64'))
  } catch {
    return null
  }
}

export function registerAutocompleteHandlers() {
  ipcMain.handle('autocomplete:complete', async (_e, params: {
    prefix: string
    suffix: string
    language: string
    filePath: string
  }) => {
    // Cancel any previous inflight completion immediately
    if (activeCompletionController) {
      activeCompletionController.abort()
      activeCompletionController = null
    }

    const { prefix, suffix, language, filePath } = params
    if (!prefix || prefix.length < 5) return { ok: true, text: '' }

    // Check cache
    const cacheKey = `${filePath}:${prefix.slice(-100)}`
    if (completionCache.has(cacheKey)) {
      return { ok: true, text: completionCache.get(cacheKey)! }
    }

    try {
      if (!existsSync(SETTINGS_FILE)) return { ok: false, error: 'Settings not found' }
      const settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))

      const providerId = settings.autocompleteProviderId || settings.defaultProviderId
      const modelId = settings.autocompleteModelId || settings.defaultModelId

      if (!providerId || !modelId) {
        return { ok: false, error: 'No model configured for autocomplete' }
      }

      const provider = settings.providers?.find((p: any) => p.id === providerId)
      if (!provider) return { ok: false, error: 'Provider not found' }

      const apiKey = resolveApiKey(provider.apiKeyRef)
      activeCompletionController = new AbortController()

      const prompt = `You are a lightning-fast inline code completion engine for an IDE.
Task: Complete the code at the exact cursor position.
Language: ${language}
File: ${filePath}

Existing code before cursor:
\`\`\`${language}
${prefix.slice(-1500)}
\`\`\`

Existing code after cursor:
\`\`\`${language}
${suffix.slice(0, 500)}
\`\`\`

INSTRUCTIONS:
- Return ONLY the exact code completion that immediately follows the cursor.
- Do not repeat the prefix or suffix.
- Do not wrap in markdown quotes.
- No explanation, no commentary.`

      let url = `${provider.baseUrl}/chat/completions`
      let headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let body: any

      if (provider.type === 'anthropic') {
        url = `${provider.baseUrl}/v1/messages`
        if (apiKey) {
          headers['x-api-key'] = apiKey
          headers['anthropic-version'] = '2023-06-01'
        }
        body = {
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 128,
          temperature: 0.2,
        }
      } else if (provider.type === 'google') {
        url = `${provider.baseUrl}/models/${modelId}:generateContent${apiKey ? `?key=${apiKey}` : ''}`
        body = {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 128 },
        }
      } else {
        // OpenAI / OpenAI-compatible / Groq / Ollama / LM Studio
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
        body = {
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 128,
        }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: activeCompletionController.signal,
      })

      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
      const data = await res.json() as any
      let completedText = ''

      if (provider.type === 'anthropic') {
        completedText = data.content?.[0]?.text || ''
      } else if (provider.type === 'google') {
        completedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      } else {
        completedText = data.choices?.[0]?.message?.content || ''
      }

      // Clean up any markdown code fences if model output them
      completedText = completedText
        .replace(/^```[a-zA-Z]*\n/, '')
        .replace(/\n```$/, '')
        .trimEnd()

      if (completedText) {
        completionCache.set(cacheKey, completedText)
        if (completionCache.size > 200) {
          const firstKey = completionCache.keys().next().value
          if (firstKey) completionCache.delete(firstKey)
        }
      }

      return { ok: true, text: completedText }
    } catch (err: any) {
      if (err.name === 'AbortError') return { ok: true, text: '' }
      return { ok: false, error: err.message }
    } finally {
      activeCompletionController = null
    }
  })
}
