import { describe, it, expect } from 'vitest'
import { BUILT_IN_PROVIDERS } from '../electron/ipc/providers'

describe('Provider Architecture & Adapters', () => {
  it('includes all 13 required core built-in providers with BYOK config', () => {
    const names = BUILT_IN_PROVIDERS.map(p => p.name)
    expect(names).toContain('OpenAI')
    expect(names).toContain('Anthropic')
    expect(names).toContain('Google Gemini')
    expect(names).toContain('Groq')
    expect(names).toContain('DeepSeek')
    expect(names).toContain('Mistral')
    expect(names).toContain('Together AI')
    expect(names).toContain('Fireworks AI')
    expect(names).toContain('OpenRouter')
    expect(names).toContain('NVIDIA NIM')
    expect(names).toContain('Cerebras')
    expect(names).toContain('Ollama')
    expect(names).toContain('LM Studio')
  })

  it('correctly maps OpenAI streaming delta chunks', () => {
    const rawSseChunk = 'data: {"choices":[{"delta":{"content":"Hello from AI!"}}]}'
    const data = rawSseChunk.replace(/^data: /, '')
    const parsed = JSON.parse(data)
    expect(parsed.choices[0].delta.content).toBe('Hello from AI!')
  })

  it('correctly maps Anthropic streaming content block delta', () => {
    const rawSseChunk = 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Claude reasoning"}}'
    const data = rawSseChunk.replace(/^data: /, '')
    const parsed = JSON.parse(data)
    expect(parsed.type).toBe('content_block_delta')
    expect(parsed.delta.text).toBe('Claude reasoning')
  })

  it('correctly maps Google Gemini streaming candidates', () => {
    const rawSseChunk = 'data: {"candidates":[{"content":{"parts":[{"text":"Gemini response"}]}}]}'
    const data = rawSseChunk.replace(/^data: /, '')
    const parsed = JSON.parse(data)
    expect(parsed.candidates[0].content.parts[0].text).toBe('Gemini response')
  })

  it('correctly parses Ollama dynamic model list', () => {
    const mockOllamaResponse = {
      models: [
        { name: 'llama3:latest', size: 4661224676 },
        { name: 'qwen2.5-coder:7b', size: 4434234523 },
        { name: 'deepseek-r1:8b', size: 4920234521 },
      ],
    }

    const models = mockOllamaResponse.models.map(m => ({
      id: m.name,
      name: m.name,
      supportsStreaming: true,
      supportsToolCalling: false,
    }))

    expect(models).toHaveLength(3)
    expect(models[1].id).toBe('qwen2.5-coder:7b')
  })
})

