import type { ProviderType } from '../types'

// Map file extension to Monaco language id
export function extToLanguage(ext: string): string {
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
    '.py': 'python',
    '.java': 'java',
    '.cs': 'csharp',
    '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp',
    '.c': 'c',
    '.h': 'cpp', '.hpp': 'cpp',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin', '.kts': 'kotlin',
    '.html': 'html', '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss', '.sass': 'scss',
    '.less': 'less',
    '.json': 'json', '.jsonc': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml', '.yml': 'yaml',
    '.toml': 'ini',
    '.md': 'markdown', '.mdx': 'markdown',
    '.sql': 'sql',
    '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell',
    '.ps1': 'powershell',
    '.dockerfile': 'dockerfile',
    '.tf': 'hcl',
    '.env': 'ini',
    '.gitignore': 'ini',
    '.prisma': 'prisma',
    '.graphql': 'graphql', '.gql': 'graphql',
    '.vue': 'html',
    '.svelte': 'html',
    '.r': 'r',
    '.lua': 'lua',
    '.dart': 'dart',
  }
  return map[ext.toLowerCase()] || 'plaintext'
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Format token count
export function formatTokens(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(1)}k`
}

// Format latency
export function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

// Calculate estimated cost
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  inputPricePerMillion: number | null,
  outputPricePerMillion: number | null
): string | null {
  if (inputPricePerMillion === null || outputPricePerMillion === null) return null
  const cost = (inputTokens / 1_000_000) * inputPricePerMillion +
    (outputTokens / 1_000_000) * outputPricePerMillion
  if (cost < 0.001) return '<$0.001'
  return `$${cost.toFixed(4)}`
}

// Provider display color
export function providerColor(type: ProviderType): string {
  const colors: Record<ProviderType, string> = {
    openai: '#10b981',
    anthropic: '#f59e0b',
    google: '#3b82f6',
    'openai-compatible': '#8b5cf6',
    ollama: '#ec4899',
    lmstudio: '#14b8a6',
  }
  return colors[type] || '#6b7280'
}

// Detect provider type from base URL
export function detectProviderType(url: string): ProviderType {
  const u = url.toLowerCase()
  if (u.includes('anthropic')) return 'anthropic'
  if (u.includes('googleapis') || u.includes('generativelanguage')) return 'google'
  if (u.includes('openai.com')) return 'openai'
  if (u.includes('localhost:11434')) return 'ollama'
  if (u.includes('localhost:1234')) return 'lmstudio'
  return 'openai-compatible'
}

// Relative time
export function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString()
}

// Truncate string
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

