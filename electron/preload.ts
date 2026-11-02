import { contextBridge, ipcRenderer } from 'electron'

// ─── Type-safe IPC bridge exposed to renderer ─────────────────────────────────
// SECURITY: Only expose specific, named channels. Never expose ipcRenderer directly.

const electronAPI = {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    onMaximized: (cb: (maximized: boolean) => void) => {
      ipcRenderer.on('window:maximized', (_e, val) => cb(val))
      return () => ipcRenderer.removeAllListeners('window:maximized')
    },
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getDataDir: () => ipcRenderer.invoke('app:getDataDir'),
  },

  // Dialogs
  dialog: {
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
    openFile: (filters?: { name: string; extensions: string[] }[]) =>
      ipcRenderer.invoke('dialog:openFile', filters),
    saveFile: (options?: object) => ipcRenderer.invoke('dialog:saveFile', options),
    confirm: (message: string, detail?: string) =>
      ipcRenderer.invoke('dialog:confirm', message, detail),
  },

  // Shell
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
    showItemInFolder: (path: string) => ipcRenderer.invoke('shell:showItemInFolder', path),
  },

  // File system
  fs: {
    readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
    deleteFile: (path: string) => ipcRenderer.invoke('fs:deleteFile', path),
    renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:renameFile', oldPath, newPath),
    createFile: (path: string, content?: string) => ipcRenderer.invoke('fs:createFile', path, content),
    createFolder: (path: string) => ipcRenderer.invoke('fs:createFolder', path),
    readDir: (path: string) => ipcRenderer.invoke('fs:readDir', path),
    exists: (path: string) => ipcRenderer.invoke('fs:exists', path),
    stat: (path: string) => ipcRenderer.invoke('fs:stat', path),
    watchWorkspace: (workspacePath: string) => ipcRenderer.invoke('fs:watchWorkspace', workspacePath),
    onFileChanged: (cb: (event: object) => void) => {
      ipcRenderer.on('fs:fileChanged', (_e, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('fs:fileChanged')
    },
    searchFiles: (workspacePath: string, query: string) =>
      ipcRenderer.invoke('fs:searchFiles', workspacePath, query),
    getWorkspaceTree: (workspacePath: string) =>
      ipcRenderer.invoke('fs:getWorkspaceTree', workspacePath),
  },

  // AI Providers
  providers: {
    list: () => ipcRenderer.invoke('providers:list'),
    add: (provider: object) => ipcRenderer.invoke('providers:add', provider),
    update: (id: string, provider: object) => ipcRenderer.invoke('providers:update', id, provider),
    delete: (id: string) => ipcRenderer.invoke('providers:delete', id),
    testConnection: (id: string) => ipcRenderer.invoke('providers:testConnection', id),
    fetchModels: (id: string) => ipcRenderer.invoke('providers:fetchModels', id),
    chat: (params: object) => ipcRenderer.invoke('providers:chat', params),
    streamChat: (params: object, onChunk: (chunk: string) => void, onDone: () => void, onError: (err: string) => void) => {
      const channel = `providers:stream:${Date.now()}`
      ipcRenderer.invoke('providers:streamChat', { ...params, channel })
      ipcRenderer.on(`${channel}:chunk`, (_e, chunk) => onChunk(chunk))
      ipcRenderer.once(`${channel}:done`, () => {
        ipcRenderer.removeAllListeners(`${channel}:chunk`)
        onDone()
      })
      ipcRenderer.once(`${channel}:error`, (_e, err) => {
        ipcRenderer.removeAllListeners(`${channel}:chunk`)
        onError(err)
      })
      // Return cancel function
      return () => ipcRenderer.send(`${channel}:cancel`)
    },
    abortStream: (channel: string) => ipcRenderer.send(`${channel}:cancel`),
  },

  // Credential storage (OS-level encrypted)
  credentials: {
    set: (key: string, value: string) => ipcRenderer.invoke('credentials:set', key, value),
    get: (key: string) => ipcRenderer.invoke('credentials:get', key),
    delete: (key: string) => ipcRenderer.invoke('credentials:delete', key),
    list: () => ipcRenderer.invoke('credentials:list'),
  },

  // Terminal (node-pty)
  terminal: {
    create: (workDir?: string) => ipcRenderer.invoke('terminal:create', workDir),
    write: (id: string, data: string) => ipcRenderer.send('terminal:write', id, data),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.send('terminal:resize', id, cols, rows),
    kill: (id: string) => ipcRenderer.invoke('terminal:kill', id),
    onData: (id: string, cb: (data: string) => void) => {
      const channel = `terminal:data:${id}`
      ipcRenderer.on(channel, (_e, data) => cb(data))
      return () => ipcRenderer.removeAllListeners(channel)
    },
    onExit: (id: string, cb: (code: number) => void) => {
      const channel = `terminal:exit:${id}`
      ipcRenderer.once(channel, (_e, code) => cb(code))
    },
  },

  // Git
  git: {
    status: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
    diff: (repoPath: string, filePath?: string) => ipcRenderer.invoke('git:diff', repoPath, filePath),
    log: (repoPath: string, limit?: number) => ipcRenderer.invoke('git:log', repoPath, limit),
    branches: (repoPath: string) => ipcRenderer.invoke('git:branches', repoPath),
    checkout: (repoPath: string, branch: string) => ipcRenderer.invoke('git:checkout', repoPath, branch),
    stage: (repoPath: string, files: string[]) => ipcRenderer.invoke('git:stage', repoPath, files),
    commit: (repoPath: string, message: string) => ipcRenderer.invoke('git:commit', repoPath, message),
    isRepo: (path: string) => ipcRenderer.invoke('git:isRepo', path),
  },

  // Agent
  agent: {
    run: (params: object) => ipcRenderer.invoke('agent:run', params),
    onStep: (cb: (step: object) => void) => {
      ipcRenderer.on('agent:step', (_e, step) => cb(step))
      return () => ipcRenderer.removeAllListeners('agent:step')
    },
    onDone: (cb: (result: object) => void) => {
      ipcRenderer.once('agent:done', (_e, result) => cb(result))
    },
    abort: () => ipcRenderer.send('agent:abort'),
  },

  // Settings persistence
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings: object) => ipcRenderer.invoke('settings:set', settings),
    reset: () => ipcRenderer.invoke('settings:reset'),
  },

  // Theme
  theme: {
    get: () => ipcRenderer.invoke('theme:get'),
  },

  // Safe storage availability
  safeStorage: {
    available: () => ipcRenderer.invoke('safeStorage:available'),
  },

  // Project Indexer & Context Retrieval
  indexer: {
    setWorkspace: (workspacePath: string) => ipcRenderer.invoke('indexer:setWorkspace', workspacePath),
    search: (query: string, maxResults?: number) => ipcRenderer.invoke('indexer:search', query, maxResults),
    getRelevantContext: (query: string, maxTokens?: number) => ipcRenderer.invoke('indexer:getRelevantContext', query, maxTokens),
    getStats: () => ipcRenderer.invoke('indexer:getStats'),
  },

  // AI Autocomplete
  autocomplete: {
    complete: (params: { prefix: string; suffix: string; language: string; filePath: string }) =>
      ipcRenderer.invoke('autocomplete:complete', params),
  },

  // Model Router & Error Classification
  router: {
    classifyError: (status: number, msg: string) => ipcRenderer.invoke('router:classifyError', status, msg),
    getRoutingConfig: () => ipcRenderer.invoke('router:getRoutingConfig'),
    saveRoutingConfig: (routing: object) => ipcRenderer.invoke('router:saveRoutingConfig', routing),
  },
}

contextBridge.exposeInMainWorld('electron', electronAPI)

// Type export for renderer (TypeScript support)
export type ElectronAPI = typeof electronAPI

