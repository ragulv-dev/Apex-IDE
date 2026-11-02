import { ipcMain } from 'electron'
import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  renameSync,
  mkdirSync,
  statSync,
  readdirSync,
  watch,
  FSWatcher,
} from 'fs'
import { join, extname, basename, relative } from 'path'
import { APP_DATA_DIR } from '../constants'

const watchers = new Map<string, FSWatcher>()

// File tree node type
interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  ext?: string
  children?: FileNode[]
}

// Directories to skip during indexing
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', '.next',
  '__pycache__', '.venv', 'venv', 'env', '.cache', 'coverage',
  '.nyc_output', '.turbo', '.parcel-cache', 'target', 'bin', 'obj',
])

function buildTree(dirPath: string, depth = 0, maxDepth = 8): FileNode[] {
  if (depth > maxDepth) return []
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true })
    const nodes: FileNode[] = []
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env') continue
      if (SKIP_DIRS.has(entry.name)) continue
      const fullPath = join(dirPath, entry.name)
      if (entry.isDirectory()) {
        nodes.push({
          name: entry.name,
          path: fullPath,
          type: 'directory',
          children: buildTree(fullPath, depth + 1, maxDepth),
        })
      } else {
        nodes.push({
          name: entry.name,
          path: fullPath,
          type: 'file',
          ext: extname(entry.name).toLowerCase(),
        })
      }
    }
    // Sort: directories first, then files, both alphabetical
    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  } catch {
    return []
  }
}

function searchInFiles(dirPath: string, query: string, results: string[] = []): string[] {
  if (results.length >= 100) return results
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      if (SKIP_DIRS.has(entry.name)) continue
      const fullPath = join(dirPath, entry.name)
      if (entry.isDirectory()) {
        searchInFiles(fullPath, query, results)
      } else {
        // Filename match
        if (entry.name.toLowerCase().includes(query.toLowerCase())) {
          results.push(fullPath)
        }
      }
    }
  } catch {}
  return results
}

export function registerFileSystemHandlers() {
  ipcMain.handle('fs:readFile', (_e, path: string) => {
    try {
      return { ok: true, content: readFileSync(path, 'utf-8') }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('fs:writeFile', (_e, path: string, content: string) => {
    try {
      writeFileSync(path, content, 'utf-8')
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('fs:createFile', (_e, path: string, content = '') => {
    try {
      if (existsSync(path)) return { ok: false, error: 'File already exists' }
      writeFileSync(path, content, 'utf-8')
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('fs:createFolder', (_e, path: string) => {
    try {
      mkdirSync(path, { recursive: true })
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('fs:deleteFile', (_e, path: string) => {
    try {
      unlinkSync(path)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('fs:renameFile', (_e, oldPath: string, newPath: string) => {
    try {
      renameSync(oldPath, newPath)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('fs:exists', (_e, path: string) => existsSync(path))

  ipcMain.handle('fs:stat', (_e, path: string) => {
    try {
      const s = statSync(path)
      return { ok: true, stat: { size: s.size, mtime: s.mtime, isDirectory: s.isDirectory() } }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('fs:readDir', (_e, path: string) => {
    try {
      const entries = readdirSync(path, { withFileTypes: true })
      return {
        ok: true,
        entries: entries.map(e => ({ name: e.name, isDirectory: e.isDirectory() })),
      }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('fs:getWorkspaceTree', (_e, workspacePath: string) => {
    try {
      if (!existsSync(workspacePath)) return { ok: false, error: 'Path not found' }
      return { ok: true, tree: buildTree(workspacePath) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('fs:searchFiles', (_e, workspacePath: string, query: string) => {
    try {
      const results = searchInFiles(workspacePath, query)
      return { ok: true, results }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('fs:watchWorkspace', (event, workspacePath: string) => {
    // Close any existing watcher for this path
    if (watchers.has(workspacePath)) {
      watchers.get(workspacePath)?.close()
    }
    try {
      const watcher = watch(workspacePath, { recursive: true }, (eventType, filename) => {
        if (!filename) return
        event.sender.send('fs:fileChanged', { eventType, filename, workspacePath })
      })
      watchers.set(workspacePath, watcher)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}

