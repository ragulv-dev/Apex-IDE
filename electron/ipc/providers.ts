import { ipcMain, safeStorage, BrowserWindow } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { SETTINGS_FILE, CREDENTIALS_FILE } from '../constants'

// ─── Provider Configuration Types ────────────────────────────────────────────

export interface ProviderConfig {
  id: string
  name: string
  type: 'openai' | 'anthropic' | 'google' | 'openai-compatible' | 'ollama' | 'lmstudio'
  baseUrl: string
  apiKeyRef: string | null  // Key in credential store (not the actual key)
  models: ModelConfig[]
  defaultModel: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface ModelConfig {
  id: string
  name: string
  contextWindow: number
  maxOutputTokens: number
  supportsStreaming: boolean
  supportsToolCalling: boolean
  supportsVision: boolean
  supportsReasoning: boolean
  inputPricePerMillion: number | null   // USD
  outputPricePerMillion: number | null  // USD
  source: 'discovered' | 'manual'
}

export interface ProvidersSettings {
  providers: ProviderConfig[]
  defaultProviderId: string | null
  defaultModelId: string | null
  autocompleteProviderId: string | null
  autocompleteModelId: string | null
  fallbackProviderId: string | null
  fallbackModelId: string | null
}

const DEFAULT_SETTINGS: ProvidersSettings = {
  providers: [],
  defaultProviderId: null,
  defaultModelId: null,
  autocompleteProviderId: null,
  autocompleteModelId: null,
  fallbackProviderId: null,
  fallbackModelId: null,
}

// ─── Built-in Provider Definitions ───────────────────────────────────────────
export const BUILT_IN_PROVIDERS: Omit<ProviderConfig, 'id' | 'apiKeyRef' | 'models' | 'defaultModel' | 'enabled' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'OpenAI', type: 'openai', baseUrl: 'https://api.openai.com/v1' },
  { name: 'Anthropic', type: 'anthropic', baseUrl: 'https://api.anthropic.com' },
  { name: 'Google Gemini', type: 'google', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  { name: 'Groq', type: 'openai-compatible', baseUrl: 'https://api.groq.com/openai/v1' },
  { name: 'DeepSeek', type: 'openai-compatible', baseUrl: 'https://api.deepseek.com/v1' },
  { name: 'Mistral', type: 'openai-compatible', baseUrl: 'https://api.mistral.ai/v1' },
  { name: 'Together AI', type: 'openai-compatible', baseUrl: 'https://api.together.xyz/v1' },
  { name: 'Fireworks AI', type: 'openai-compatible', baseUrl: 'https://api.fireworks.ai/inference/v1' },
  { name: 'OpenRouter', type: 'openai-compatible', baseUrl: 'https://openrouter.ai/api/v1' },
  { name: 'NVIDIA NIM', type: 'openai-compatible', baseUrl: 'https://integrate.api.nvidia.com/v1' },
  { name: 'Cerebras', type: 'openai-compatible', baseUrl: 'https://api.cerebras.ai/v1' },
  { name: 'Ollama', type: 'ollama', baseUrl: 'http://localhost:11434' },
  { name: 'LM Studio', type: 'lmstudio', baseUrl: 'http://localhost:1234/v1' },
]

// ─── Settings Persistence ─────────────────────────────────────────────────────
function loadProviderSettings(): ProvidersSettings {
  try {
    if (!existsSync(SETTINGS_FILE)) return DEFAULT_SETTINGS
    const raw = readFileSync(SETTINGS_FILE, 'utf-8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveProviderSettings(settings: ProvidersSettings) {
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
}

// ─── API Key Resolution (Main Process Only) ───────────────────────────────────
function resolveApiKey(apiKeyRef: string | null): string | null {
  if (!apiKeyRef) return null
  try {
    const { readFileSync, existsSync } = require('fs')
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

// ─── Provider-Specific API Requests ──────────────────────────────────────────
async function fetchModelsFromProvider(provider: ProviderConfig): Promise<ModelConfig[]> {
  const apiKey = resolveApiKey(provider.apiKeyRef)

  switch (provider.type) {
    case 'openai':
    case 'openai-compatible':
    case 'lmstudio': {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
      const res = await fetch(`${provider.baseUrl}/models`, { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      const data = await res.json() as { data: { id: string }[] }
      return data.data.map(m => ({
        id: m.id, name: m.id,
        contextWindow: 128000, maxOutputTokens: 16384,
        supportsStreaming: true, supportsToolCalling: true,
        supportsVision: false, supportsReasoning: false,
        inputPricePerMillion: null, outputPricePerMillion: null,
        source: 'discovered' as const,
      }))
    }

    case 'ollama': {
      const res = await fetch(`${provider.baseUrl}/api/tags`)
      if (!res.ok) throw new Error(`Ollama unreachable: HTTP ${res.status}`)
      const data = await res.json() as { models: { name: string; size: number }[] }
      return data.models.map(m => ({
        id: m.name, name: m.name,
        contextWindow: 32768, maxOutputTokens: 4096,
        supportsStreaming: true, supportsToolCalling: false,
        supportsVision: false, supportsReasoning: false,
        inputPricePerMillion: 0, outputPricePerMillion: 0,
        source: 'discovered' as const,
      }))
    }

    case 'anthropic': {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      }
      if (apiKey) headers['x-api-key'] = apiKey
      const res = await fetch(`${provider.baseUrl}/v1/models`, { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      const data = await res.json() as { data: { id: string; display_name: string }[] }
      return data.data.map(m => ({
        id: m.id, name: m.display_name || m.id,
        contextWindow: 200000, maxOutputTokens: 8192,
        supportsStreaming: true, supportsToolCalling: true,
        supportsVision: true, supportsReasoning: m.id.includes('3-5') || m.id.includes('3-7'),
        inputPricePerMillion: null, outputPricePerMillion: null,
        source: 'discovered' as const,
      }))
    }

    case 'google': {
      const url = apiKey
        ? `${provider.baseUrl}/models?key=${apiKey}`
        : `${provider.baseUrl}/models`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      const data = await res.json() as { models: { name: string; displayName: string; supportedGenerationMethods: string[] }[] }
      return (data.models || [])
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => ({
          id: m.name.replace('models/', ''), name: m.displayName || m.name,
          contextWindow: 1000000, maxOutputTokens: 8192,
          supportsStreaming: true, supportsToolCalling: true,
          supportsVision: true, supportsReasoning: false,
          inputPricePerMillion: null, outputPricePerMillion: null,
          source: 'discovered' as const,
        }))
    }

    default:
      return []
  }
}

// ─── Test Connection ──────────────────────────────────────────────────────────
async function testProviderConnection(provider: ProviderConfig): Promise<{ ok: boolean; latency?: number; error?: string }> {
  const start = Date.now()
  const apiKey = resolveApiKey(provider.apiKeyRef)

  try {
    switch (provider.type) {
      case 'openai':
      case 'openai-compatible':
      case 'lmstudio': {
        const headers: Record<string, string> = {}
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
        const res = await fetch(`${provider.baseUrl}/models`, { headers, signal: AbortSignal.timeout(5000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return { ok: true, latency: Date.now() - start }
      }
      case 'ollama': {
        const res = await fetch(`${provider.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return { ok: true, latency: Date.now() - start }
      }
      case 'anthropic': {
        const headers: Record<string, string> = { 'anthropic-version': '2023-06-01' }
        if (apiKey) headers['x-api-key'] = apiKey
        const res = await fetch(`${provider.baseUrl}/v1/models`, { headers, signal: AbortSignal.timeout(5000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return { ok: true, latency: Date.now() - start }
      }
      case 'google': {
        const url = apiKey
          ? `${provider.baseUrl}/models?key=${apiKey}`
          : `${provider.baseUrl}/models`
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return { ok: true, latency: Date.now() - start }
      }
    }
    return { ok: false, error: 'Unknown provider type' }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

// ─── Streaming Chat ───────────────────────────────────────────────────────────
const activeStreams = new Map<string, AbortController>()

async function streamChatCompletion(
  provider: ProviderConfig,
  model: string,
  messages: object[],
  tools: object[] | undefined,
  channel: string,
  sender: Electron.WebContents,
  temperature = 0.7,
  maxTokens = 4096,
) {
  const apiKey = resolveApiKey(provider.apiKeyRef)
  const controller = new AbortController()
  activeStreams.set(channel, controller)

  try {
    let url: string
    let headers: Record<string, string> = { 'Content-Type': 'application/json' }
    let body: object

    switch (provider.type) {
      case 'anthropic': {
        url = `${provider.baseUrl}/v1/messages`
        if (apiKey) {
          headers['x-api-key'] = apiKey
          headers['anthropic-version'] = '2023-06-01'
        }
        // Extract system message for Anthropic
        const systemMsg = (messages as any[]).find(m => m.role === 'system')
        const userMessages = (messages as any[]).filter(m => m.role !== 'system')
        body = {
          model,
          messages: userMessages,
          system: systemMsg?.content,
          max_tokens: maxTokens,
          stream: true,
          ...(tools && tools.length > 0 ? { tools } : {}),
        }
        break
      }
      case 'google': {
        url = `${provider.baseUrl}/models/${model}:streamGenerateContent${apiKey ? `?key=${apiKey}` : ''}&alt=sse`
        // Convert OpenAI-style messages to Gemini format
        const contents = (messages as any[])
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
        const systemInstruction = (messages as any[]).find(m => m.role === 'system')
        body = {
          contents,
          ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction.content }] } } : {}),
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }
        break
      }
      default: { // OpenAI, OpenAI-compatible, Ollama, LM Studio
        url = `${provider.baseUrl}/chat/completions`
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
        body = {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
          ...(tools && tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
        }
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`API error ${res.status}: ${errText}`)
    }

    if (!res.body) throw new Error('No response body')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim() || line === 'data: [DONE]') continue
        const data = line.replace(/^data: /, '')
        if (!data.trim()) continue

        try {
          const parsed = JSON.parse(data)
          let chunk = ''

          if (provider.type === 'anthropic') {
            if (parsed.type === 'content_block_delta') {
              chunk = parsed.delta?.text || ''
            }
          } else if (provider.type === 'google') {
            chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
          } else {
            chunk = parsed.choices?.[0]?.delta?.content || ''
            // Handle tool calls
            const toolCall = parsed.choices?.[0]?.delta?.tool_calls?.[0]
            if (toolCall) {
              sender.send(`${channel}:toolCall`, toolCall)
            }
          }

          if (chunk) sender.send(`${channel}:chunk`, chunk)
        } catch {}
      }
    }

    sender.send(`${channel}:done`)
  } catch (err: any) {
    if (err.name === 'AbortError') {
      sender.send(`${channel}:done`)
    } else {
      sender.send(`${channel}:error`, err.message)
    }
  } finally {
    activeStreams.delete(channel)
  }
}

// ─── Register Handlers ────────────────────────────────────────────────────────
export function registerProviderHandlers() {
  ipcMain.handle('providers:list', () => {
    const settings = loadProviderSettings()
    return { ok: true, settings }
  })

  ipcMain.handle('providers:add', (_e, provider: ProviderConfig) => {
    const settings = loadProviderSettings()
    settings.providers.push(provider)
    saveProviderSettings(settings)
    return { ok: true }
  })

  ipcMain.handle('providers:update', (_e, id: string, updates: Partial<ProviderConfig>) => {
    const settings = loadProviderSettings()
    const idx = settings.providers.findIndex(p => p.id === id)
    if (idx === -1) return { ok: false, error: 'Provider not found' }
    settings.providers[idx] = {
      ...settings.providers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    saveProviderSettings(settings)
    return { ok: true }
  })

  ipcMain.handle('providers:delete', (_e, id: string) => {
    const settings = loadProviderSettings()
    settings.providers = settings.providers.filter(p => p.id !== id)
    if (settings.defaultProviderId === id) settings.defaultProviderId = null
    saveProviderSettings(settings)
    return { ok: true }
  })

  ipcMain.handle('providers:testConnection', async (_e, id: string) => {
    const settings = loadProviderSettings()
    const provider = settings.providers.find(p => p.id === id)
    if (!provider) return { ok: false, error: 'Provider not found' }
    return testProviderConnection(provider)
  })

  ipcMain.handle('providers:fetchModels', async (_e, id: string) => {
    const settings = loadProviderSettings()
    const provider = settings.providers.find(p => p.id === id)
    if (!provider) return { ok: false, error: 'Provider not found' }
    try {
      const models = await fetchModelsFromProvider(provider)
      // Update stored models
      provider.models = models
      provider.updatedAt = new Date().toISOString()
      const idx = settings.providers.findIndex(p => p.id === id)
      settings.providers[idx] = provider
      saveProviderSettings(settings)
      return { ok: true, models }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('providers:streamChat', async (event, params: {
    providerId: string
    modelId: string
    messages: object[]
    tools?: object[]
    channel: string
    temperature?: number
    maxTokens?: number
  }) => {
    const settings = loadProviderSettings()
    const provider = settings.providers.find(p => p.id === params.providerId)
    if (!provider) {
      event.sender.send(`${params.channel}:error`, 'Provider not found')
      return
    }

    // Cancel handler
    ipcMain.once(`${params.channel}:cancel`, () => {
      activeStreams.get(params.channel)?.abort()
    })

    await streamChatCompletion(
      provider,
      params.modelId,
      params.messages,
      params.tools,
      params.channel,
      event.sender,
      params.temperature ?? 0.7,
      params.maxTokens ?? 4096,
    )
  })

  ipcMain.handle('providers:builtIn', () => BUILT_IN_PROVIDERS)

  // Settings
  ipcMain.handle('settings:get', () => {
    return loadProviderSettings()
  })

  ipcMain.handle('settings:set', (_e, updates: Partial<ProvidersSettings>) => {
    const settings = loadProviderSettings()
    const merged = { ...settings, ...updates }
    saveProviderSettings(merged)
    return { ok: true }
  })

  ipcMain.handle('settings:reset', () => {
    saveProviderSettings(DEFAULT_SETTINGS)
    return { ok: true }
  })
}

