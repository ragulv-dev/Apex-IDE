import { ipcMain, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

// Agent runs in the main process so it has full access to the file system,
// API keys, and can stream results back to the renderer via IPC.

let agentAbortController: AbortController | null = null

export function registerAgentHandlers() {
  ipcMain.handle('agent:run', async (event, params: {
    task: string
    workspacePath: string
    providerId: string
    modelId: string
    messages: object[]
    mode: 'ask' | 'plan' | 'agent'
  }) => {
    agentAbortController = new AbortController()

    try {
      event.sender.send('agent:step', {
        type: 'thinking',
        message: 'Analyzing your request...',
      })

      // The actual agent logic is in the renderer-side agent engine
      // This handler is the execution layer for approved tool calls
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  // Execute a specific tool call (called by the renderer agent engine)
  ipcMain.handle('agent:executeTool', async (event, tool: {
    name: string
    args: Record<string, unknown>
    workspacePath: string
  }) => {
    const { name, args, workspacePath } = tool

    try {
      switch (name) {
        case 'read_file': {
          const path = join(workspacePath, args.path as string)
          if (!existsSync(path)) return { error: `File not found: ${args.path}` }
          const content = readFileSync(path, 'utf-8')
          return { content }
        }

        case 'write_file': {
          const path = join(workspacePath, args.path as string)
          const dir = dirname(path)
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
          writeFileSync(path, args.content as string, 'utf-8')
          event.sender.send('agent:step', { type: 'file_written', path: args.path })
          return { success: true }
        }

        case 'list_files': {
          const { readdirSync, statSync } = require('fs')
          const dirPath = args.path ? join(workspacePath, args.path as string) : workspacePath
          if (!existsSync(dirPath)) return { error: `Directory not found: ${args.path}` }
          const entries = readdirSync(dirPath, { withFileTypes: true })
            .filter((e: any) => !['node_modules', '.git', 'dist', 'build'].includes(e.name))
            .map((e: any) => `${e.isDirectory() ? '[dir]' : '[file]'} ${e.name}`)
          return { files: entries.join('\n') }
        }

        case 'search_files': {
          // Simple grep-like search
          const { readdirSync: rd, readFileSync: rf, statSync: ss } = require('fs')
          const query = args.query as string
          const results: { file: string; line: number; content: string }[] = []

          function searchDir(dir: string) {
            if (results.length >= 50) return
            try {
              const entries = rd(dir, { withFileTypes: true })
              for (const entry of entries) {
                if (['node_modules', '.git', 'dist', 'build', '__pycache__'].includes(entry.name)) continue
                const fullPath = join(dir, entry.name)
                if (entry.isDirectory()) {
                  searchDir(fullPath)
                } else {
                  try {
                    const content = rf(fullPath, 'utf-8')
                    const lines = content.split('\n')
                    lines.forEach((line: string, idx: number) => {
                      if (line.toLowerCase().includes(query.toLowerCase())) {
                        results.push({
                          file: fullPath.replace(workspacePath, '').replace(/\\/g, '/'),
                          line: idx + 1,
                          content: line.trim(),
                        })
                      }
                    })
                  } catch {}
                }
              }
            } catch {}
          }

          searchDir(workspacePath)
          return { results }
        }

        case 'run_command': {
          // Commands require user approval — enforced at the renderer level
          const { execSync } = require('child_process')
          try {
            const output = execSync(args.command as string, {
              cwd: args.cwd ? join(workspacePath, args.cwd as string) : workspacePath,
              encoding: 'utf-8',
              timeout: 30000,
            })
            return { output }
          } catch (err: any) {
            return { error: err.message, output: err.stdout || '' }
          }
        }

        default:
          return { error: `Unknown tool: ${name}` }
      }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  ipcMain.on('agent:abort', () => {
    agentAbortController?.abort()
  })
}

