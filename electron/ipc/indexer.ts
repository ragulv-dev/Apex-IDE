import { ipcMain } from 'electron'
import { readdirSync, readFileSync, statSync, existsSync } from 'fs'
import { join, extname, relative } from 'path'

export interface IndexedSymbol {
  name: string
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'import'
  line: number
  file: string
}

export interface IndexedFile {
  relativePath: string
  fullPath: string
  size: number
  lastModified: number
  language: string
  symbols: IndexedSymbol[]
  summary?: string
}

export interface SearchResultSnippet {
  file: string
  line: number
  matchContent: string
  context: string
}

class ProjectIndexer {
  private workspacePath: string | null = null
  private fileIndex: Map<string, IndexedFile> = new Map()
  private isIndexing: boolean = false

  private ignoreDirs = new Set([
    'node_modules', '.git', 'dist', 'dist-electron', 'build', 'out', 
    '.next', '__pycache__', '.venv', 'venv', 'env', '.cache', 'coverage',
    '.turbo', 'release', 'bin', 'obj', '.idea', '.vscode'
  ])

  private supportedExtensions = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.cpp', '.c', 
    '.go', '.rs', '.rb', '.php', '.html', '.css', '.scss', '.json', 
    '.md', '.sql', '.prisma', '.graphql', '.yaml', '.yml'
  ])

  public setWorkspace(workspace: string) {
    this.workspacePath = workspace
    this.fileIndex.clear()
  }

  public async indexWorkspace(onProgress?: (indexedCount: number) => void): Promise<number> {
    if (!this.workspacePath || !existsSync(this.workspacePath)) return 0
    this.isIndexing = true

    const filesToScan: string[] = []
    this.collectFiles(this.workspacePath, filesToScan)

    let count = 0
    for (const filePath of filesToScan) {
      try {
        const stats = statSync(filePath)
        if (stats.size > 500_000) continue // Skip files larger than 500KB to save memory

        const content = readFileSync(filePath, 'utf-8')
        const relPath = relative(this.workspacePath, filePath).replace(/\\/g, '/')
        const ext = extname(filePath).toLowerCase()

        const symbols = this.extractSymbols(content, relPath, ext)
        this.fileIndex.set(relPath, {
          relativePath: relPath,
          fullPath: filePath,
          size: stats.size,
          lastModified: stats.mtimeMs,
          language: ext.slice(1),
          symbols,
        })
        count++
        if (onProgress && count % 25 === 0) onProgress(count)
      } catch {}
    }

    this.isIndexing = false
    return count
  }

  private collectFiles(dir: string, fileList: string[]) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.env') continue
        if (this.ignoreDirs.has(entry.name)) continue

        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          this.collectFiles(full, fileList)
        } else {
          const ext = extname(entry.name).toLowerCase()
          if (this.supportedExtensions.has(ext)) {
            fileList.push(full)
          }
        }
      }
    } catch {}
  }

  private extractSymbols(content: string, file: string, ext: string): IndexedSymbol[] {
    const symbols: IndexedSymbol[] = []
    const lines = content.split('\n')

    // Fast regex parser for symbols (ultra lightweight, no heavy C++ treesitter required)
    const functionRegex = /(?:function\s+([A-Za-z0-9_$]+)|(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>|def\s+([A-Za-z0-9_]+))/
    const classRegex = /(?:class\s+([A-Za-z0-9_$]+))/
    const interfaceRegex = /(?:interface\s+([A-Za-z0-9_$]+))/
    const typeRegex = /(?:type\s+([A-Za-z0-9_$]+)\s*=)/

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || line.startsWith('//') || line.startsWith('#') || line.startsWith('/*')) continue

      const fnMatch = line.match(functionRegex)
      if (fnMatch) {
        const name = fnMatch[1] || fnMatch[2] || fnMatch[3]
        if (name && name.length > 1) {
          symbols.push({ name, kind: 'function', line: i + 1, file })
          continue
        }
      }

      const classMatch = line.match(classRegex)
      if (classMatch && classMatch[1]) {
        symbols.push({ name: classMatch[1], kind: 'class', line: i + 1, file })
        continue
      }

      const ifaceMatch = line.match(interfaceRegex)
      if (ifaceMatch && ifaceMatch[1]) {
        symbols.push({ name: ifaceMatch[1], kind: 'interface', line: i + 1, file })
        continue
      }

      const typeMatch = line.match(typeRegex)
      if (typeMatch && typeMatch[1]) {
        symbols.push({ name: typeMatch[1], kind: 'type', line: i + 1, file })
        continue
      }
    }

    return symbols
  }

  public search(query: string, maxResults = 20): SearchResultSnippet[] {
    const results: SearchResultSnippet[] = []
    const lowerQuery = query.toLowerCase()

    for (const [relPath, indexed] of this.fileIndex.entries()) {
      if (results.length >= maxResults) break

      try {
        const content = readFileSync(indexed.fullPath, 'utf-8')
        const lines = content.split('\n')

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(lowerQuery)) {
            const start = Math.max(0, i - 2)
            const end = Math.min(lines.length, i + 3)
            const context = lines.slice(start, end).join('\n')

            results.push({
              file: relPath,
              line: i + 1,
              matchContent: lines[i].trim(),
              context,
            })

            if (results.length >= maxResults) break
          }
        }
      } catch {}
    }

    return results
  }

  public getRelevantContext(query: string, maxTokens = 4000): string {
    const snippets = this.search(query, 8)
    if (snippets.length === 0) return ''

    let promptContext = '### Relevant Workspace Code Snippets:\n\n'
    let tokenEstimate = 0

    for (const snip of snippets) {
      const block = `File: ${snip.file} (Line ${snip.line})\n\`\`\`\n${snip.context}\n\`\`\`\n\n`
      const est = Math.ceil(block.length / 4)
      if (tokenEstimate + est > maxTokens) break
      promptContext += block
      tokenEstimate += est
    }

    return promptContext
  }

  public getStats() {
    return {
      indexedFilesCount: this.fileIndex.size,
      totalSymbolsCount: Array.from(this.fileIndex.values()).reduce((acc, f) => acc + f.symbols.length, 0),
      isIndexing: this.isIndexing,
    }
  }
}

const indexer = new ProjectIndexer()

export function registerIndexerHandlers() {
  ipcMain.handle('indexer:setWorkspace', async (_e, workspacePath: string) => {
    indexer.setWorkspace(workspacePath)
    const count = await indexer.indexWorkspace()
    return { ok: true, count }
  })

  ipcMain.handle('indexer:search', (_e, query: string, maxResults?: number) => {
    return { ok: true, results: indexer.search(query, maxResults) }
  })

  ipcMain.handle('indexer:getRelevantContext', (_e, query: string, maxTokens?: number) => {
    return { ok: true, context: indexer.getRelevantContext(query, maxTokens) }
  })

  ipcMain.handle('indexer:getStats', () => {
    return { ok: true, stats: indexer.getStats() }
  })
}

