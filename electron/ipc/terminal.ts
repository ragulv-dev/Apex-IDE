import { ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import * as os from 'os'

// node-pty is a native module — dynamically loaded at runtime
interface IPtyProcess {
  pid: number
  onData: (callback: (data: string) => void) => void
  onExit: (callback: (event: { exitCode: number }) => void) => void
  write: (data: string) => void
  resize: (cols: number, rows: number) => void
  kill: () => void
}

interface PtyModule {
  spawn: (file: string, args: string[], options: any) => IPtyProcess
}

let pty: PtyModule | null = null
try {
  pty = require('node-pty')
} catch {
  console.warn('[terminal] node-pty not available — terminal will be disabled')
}

interface TerminalSession {
  id: string
  pty: IPtyProcess
}

const sessions = new Map<string, TerminalSession>()
let sessionCounter = 0

const getShell = () => {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'powershell.exe'
  }
  return process.env.SHELL || '/bin/bash'
}

export function registerTerminalHandlers() {
  ipcMain.handle('terminal:create', (event, workDir?: string) => {
    if (!pty) return { ok: false, error: 'node-pty not available. Run: npm run electron:rebuild' }

    const id = `term_${++sessionCounter}`
    const shell = getShell()
    const cwd = workDir || os.homedir()

    try {
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        } as Record<string, string>,
      })

      ptyProcess.onData((data: string) => {
        event.sender.send(`terminal:data:${id}`, data)
      })

      ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
        event.sender.send(`terminal:exit:${id}`, exitCode)
        sessions.delete(id)
      })

      sessions.set(id, { id, pty: ptyProcess })
      return { ok: true, id, shell, pid: ptyProcess.pid }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.on('terminal:write', (_e, id: string, data: string) => {
    sessions.get(id)?.pty.write(data)
  })

  ipcMain.on('terminal:resize', (_e, id: string, cols: number, rows: number) => {
    sessions.get(id)?.pty.resize(cols, rows)
  })

  ipcMain.handle('terminal:kill', (_e, id: string) => {
    const session = sessions.get(id)
    if (!session) return { ok: false, error: 'Session not found' }
    session.pty.kill()
    sessions.delete(id)
    return { ok: true }
  })
}

