import { ipcMain } from 'electron'
import { SETTINGS_FILE } from '../constants'
import { existsSync, readFileSync, writeFileSync } from 'fs'

export interface ModelRoutingConfig {
  primaryProviderId: string | null
  primaryModelId: string | null
  fastProviderId: string | null
  fastModelId: string | null
  reasoningProviderId: string | null
  reasoningModelId: string | null
  codingProviderId: string | null
  codingModelId: string | null
  autocompleteProviderId: string | null
  autocompleteModelId: string | null
  backupProviderId: string | null
  backupModelId: string | null
  autoFallbackEnabled: boolean
  maxRetries: number
}

export type RoutingTaskType = 'default' | 'fast' | 'reasoning' | 'coding' | 'autocomplete'

export interface FallbackEvent {
  originalProviderId: string
  originalModelId: string
  fallbackProviderId: string
  fallbackModelId: string
  reason: string
  timestamp: number
}

export class ModelRouter {
  public static classifyError(status: number, errMessage: string): {
    isTransient: boolean
    shouldFallback: boolean
    type: 'rate_limit' | 'auth' | 'timeout' | 'server_error' | 'context_exceeded' | 'unknown'
  } {
    const msg = errMessage.toLowerCase()

    if (status === 429 || msg.includes('rate limit') || msg.includes('quota') || msg.includes('too many requests')) {
      return { isTransient: true, shouldFallback: true, type: 'rate_limit' }
    }
    if (status === 401 || status === 403 || msg.includes('invalid api key') || msg.includes('unauthorized') || msg.includes('authentication')) {
      return { isTransient: false, shouldFallback: true, type: 'auth' }
    }
    if (status === 408 || status === 504 || msg.includes('timeout') || msg.includes('timed out')) {
      return { isTransient: true, shouldFallback: true, type: 'timeout' }
    }
    if (msg.includes('context length') || msg.includes('maximum context') || msg.includes('too long')) {
      return { isTransient: false, shouldFallback: true, type: 'context_exceeded' }
    }
    if (status >= 500) {
      return { isTransient: true, shouldFallback: true, type: 'server_error' }
    }

    return { isTransient: false, shouldFallback: false, type: 'unknown' }
  }

  public static getTargetModelForTask(
    task: RoutingTaskType,
    routing: ModelRoutingConfig,
    defaultProviderId: string | null,
    defaultModelId: string | null
  ): { providerId: string | null; modelId: string | null } {
    switch (task) {
      case 'fast':
        if (routing.fastProviderId && routing.fastModelId) {
          return { providerId: routing.fastProviderId, modelId: routing.fastModelId }
        }
        break
      case 'reasoning':
        if (routing.reasoningProviderId && routing.reasoningModelId) {
          return { providerId: routing.reasoningProviderId, modelId: routing.reasoningModelId }
        }
        break
      case 'coding':
        if (routing.codingProviderId && routing.codingModelId) {
          return { providerId: routing.codingProviderId, modelId: routing.codingModelId }
        }
        break
      case 'autocomplete':
        if (routing.autocompleteProviderId && routing.autocompleteModelId) {
          return { providerId: routing.autocompleteProviderId, modelId: routing.autocompleteModelId }
        }
        break
    }

    return {
      providerId: routing.primaryProviderId || defaultProviderId,
      modelId: routing.primaryModelId || defaultModelId,
    }
  }
}

export function registerRouterHandlers() {
  ipcMain.handle('router:classifyError', (_e, status: number, msg: string) => {
    return ModelRouter.classifyError(status, msg)
  })

  ipcMain.handle('router:getRoutingConfig', () => {
    try {
      if (!existsSync(SETTINGS_FILE)) return { ok: false }
      const settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
      return { ok: true, routing: settings.routing || {} }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('router:saveRoutingConfig', (_e, routing: Partial<ModelRoutingConfig>) => {
    try {
      if (!existsSync(SETTINGS_FILE)) return { ok: false }
      const settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
      settings.routing = { ...settings.routing, ...routing }
      writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}
