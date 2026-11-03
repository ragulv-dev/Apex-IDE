import { describe, it, expect } from 'vitest'
import { ModelRouter, ModelRoutingConfig } from '../electron/ipc/router'

describe('ModelRouter - Error Classification & Fallback Routing', () => {
  it('correctly classifies HTTP 429 as a rate limit requiring fallback', () => {
    const result = ModelRouter.classifyError(429, 'Rate limit exceeded: please slow down')
    expect(result.type).toBe('rate_limit')
    expect(result.isTransient).toBe(true)
    expect(result.shouldFallback).toBe(true)
  })

  it('correctly classifies HTTP 401 as an auth error requiring fallback', () => {
    const result = ModelRouter.classifyError(401, 'Invalid API key provided')
    expect(result.type).toBe('auth')
    expect(result.isTransient).toBe(false)
    expect(result.shouldFallback).toBe(true)
  })

  it('correctly classifies HTTP 504 / timeout as a timeout requiring fallback', () => {
    const result = ModelRouter.classifyError(504, 'Gateway timeout')
    expect(result.type).toBe('timeout')
    expect(result.isTransient).toBe(true)
    expect(result.shouldFallback).toBe(true)
  })

  it('correctly classifies context length exceeded errors', () => {
    const result = ModelRouter.classifyError(400, 'This model maximum context length is 8192 tokens')
    expect(result.type).toBe('context_exceeded')
    expect(result.shouldFallback).toBe(true)
  })

  it('correctly routes tasks to configured specialized models', () => {
    const routing: ModelRoutingConfig = {
      primaryProviderId: 'prov-openai',
      primaryModelId: 'gpt-4o',
      fastProviderId: 'prov-groq',
      fastModelId: 'llama-3.3-70b-versatile',
      reasoningProviderId: 'prov-deepseek',
      reasoningModelId: 'deepseek-reasoner',
      codingProviderId: 'prov-anthropic',
      codingModelId: 'claude-3-7-sonnet',
      autocompleteProviderId: 'prov-ollama',
      autocompleteModelId: 'qwen2.5-coder:7b',
      backupProviderId: 'prov-openrouter',
      backupModelId: 'mistral-large',
      autoFallbackEnabled: true,
      maxRetries: 3,
    }

    const fast = ModelRouter.getTargetModelForTask('fast', routing, null, null)
    expect(fast.modelId).toBe('llama-3.3-70b-versatile')

    const reasoning = ModelRouter.getTargetModelForTask('reasoning', routing, null, null)
    expect(reasoning.modelId).toBe('deepseek-reasoner')

    const coding = ModelRouter.getTargetModelForTask('coding', routing, null, null)
    expect(coding.modelId).toBe('claude-3-7-sonnet')

    const autocomplete = ModelRouter.getTargetModelForTask('autocomplete', routing, null, null)
    expect(autocomplete.modelId).toBe('qwen2.5-coder:7b')
  })
})

