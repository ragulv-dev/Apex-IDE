// Minimal path utilities that work in browser context
export function extname(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1 || lastDot === 0) return ''
  return filename.slice(lastDot)
}

export function basename(filepath: string): string {
  return filepath.replace(/\\/g, '/').split('/').pop() || filepath
}

export function dirname(filepath: string): string {
  const normalized = filepath.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  return idx === -1 ? '.' : normalized.slice(0, idx)
}

export function join(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/')
}

