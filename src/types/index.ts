// Provider and model types (mirrored from electron/ipc/providers.ts)

export type ProviderType = 'openai' | 'anthropic' | 'google' | 'openai-compatible' | 'ollama' | 'lmstudio'

export interface ModelConfig {
  id: string
  name: string
  contextWindow: number
  maxOutputTokens: number
  supportsStreaming: boolean
  supportsToolCalling: boolean
  supportsVision: boolean
  supportsReasoning: boolean
  inputPricePerMillion: number | null
  outputPricePerMillion: number | null
  source: 'discovered' | 'manual'
}

export interface ProviderConfig {
  id: string
  name: string
  type: ProviderType
  baseUrl: string
  apiKeyRef: string | null
  models: ModelConfig[]
  defaultModel: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
  // Runtime state (not persisted)
  status?: 'connected' | 'error' | 'testing' | 'unknown'
  latency?: number
  lastError?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  model?: string
  providerId?: string
  timestamp: number
  tokens?: { input: number; output: number }
}

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'error'
  result?: string
}

export interface ToolResult {
  toolCallId: string
  result: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  providerId: string | null
  modelId: string | null
  workspacePath: string | null
  createdAt: number
  updatedAt: number
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  ext?: string
  children?: FileNode[]
  isOpen?: boolean
}

export interface EditorTab {
  id: string
  filePath: string
  fileName: string
  content: string
  originalContent: string
  language: string
  isDirty: boolean
  cursorLine?: number
  cursorCol?: number
}

export type AgentMode = 'ask' | 'plan' | 'agent'

export interface AppSettings {
  theme: 'dark' | 'light'
  fontSize: number
  fontFamily: string
  tabSize: number
  wordWrap: boolean
  minimap: boolean
  autocomplete: boolean
  autocompleteDelay: number
  defaultProviderId: string | null
  defaultModelId: string | null
  autocompleteProviderId: string | null
  autocompleteModelId: string | null
  fallbackProviderId: string | null
  fallbackModelId: string | null
  agentMode: AgentMode
  maxContextTokens: number
  temperature: number
  maxOutputTokens: number
  requireApprovalForCommands: boolean
  requireApprovalForFileDelete: boolean
  providers: ProviderConfig[]
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  tabSize: 2,
  wordWrap: false,
  minimap: true,
  autocomplete: true,
  autocompleteDelay: 400,
  defaultProviderId: null,
  defaultModelId: null,
  autocompleteProviderId: null,
  autocompleteModelId: null,
  fallbackProviderId: null,
  fallbackModelId: null,
  agentMode: 'ask',
  maxContextTokens: 32000,
  temperature: 0.7,
  maxOutputTokens: 4096,
  requireApprovalForCommands: true,
  requireApprovalForFileDelete: true,
  providers: [],
}

