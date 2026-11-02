import { ipcMain } from 'electron'
import { simpleGit, SimpleGit, StatusResult } from 'simple-git'

const gitInstances = new Map<string, SimpleGit>()

function getGit(repoPath: string): SimpleGit {
  if (!gitInstances.has(repoPath)) {
    gitInstances.set(repoPath, simpleGit(repoPath))
  }
  return gitInstances.get(repoPath)!
}

export function registerGitHandlers() {
  ipcMain.handle('git:isRepo', async (_e, path: string) => {
    try {
      const git = simpleGit(path)
      await git.revparse(['--git-dir'])
      return { ok: true, isRepo: true }
    } catch {
      return { ok: true, isRepo: false }
    }
  })

  ipcMain.handle('git:status', async (_e, repoPath: string) => {
    try {
      const git = getGit(repoPath)
      const status: StatusResult = await git.status()
      const branch = await git.revparse(['--abbrev-ref', 'HEAD']).catch(() => 'HEAD')
      return { ok: true, status, branch }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('git:diff', async (_e, repoPath: string, filePath?: string) => {
    try {
      const git = getGit(repoPath)
      const diff = filePath
        ? await git.diff([filePath])
        : await git.diff()
      return { ok: true, diff }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('git:log', async (_e, repoPath: string, limit = 20) => {
    try {
      const git = getGit(repoPath)
      const log = await git.log({ maxCount: limit })
      return { ok: true, log: log.all }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('git:branches', async (_e, repoPath: string) => {
    try {
      const git = getGit(repoPath)
      const branches = await git.branch(['-a'])
      return { ok: true, branches }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('git:checkout', async (_e, repoPath: string, branch: string) => {
    try {
      const git = getGit(repoPath)
      await git.checkout(branch)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('git:stage', async (_e, repoPath: string, files: string[]) => {
    try {
      const git = getGit(repoPath)
      await git.add(files)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('git:commit', async (_e, repoPath: string, message: string) => {
    try {
      const git = getGit(repoPath)
      const result = await git.commit(message)
      return { ok: true, result }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}

