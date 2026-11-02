import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  dialog,
  safeStorage,
  nativeTheme,
  Menu,
  MenuItem,
} from 'electron'
import { join, resolve } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { registerFileSystemHandlers } from './ipc/filesystem'
import { registerProviderHandlers } from './ipc/providers'
import { registerCredentialHandlers } from './ipc/credentials'
import { registerTerminalHandlers } from './ipc/terminal'
import { registerGitHandlers } from './ipc/git'
import { registerAgentHandlers } from './ipc/agent'
import { registerIndexerHandlers } from './ipc/indexer'
import { registerAutocompleteHandlers } from './ipc/autocomplete'
import { registerRouterHandlers } from './ipc/router'

import { APP_DATA_DIR, SETTINGS_FILE, CREDENTIALS_FILE, ensureAppDataDir } from './constants'

const isDev = process.env.NODE_ENV === 'development'
const RENDERER_URL = 'http://localhost:5173'

let mainWindow: BrowserWindow | null = null

// ─── Window Creation ──────────────────────────────────────────────────────────
async function createWindow() {
  ensureAppDataDir()

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,          // Custom title bar
    titleBarStyle: 'hidden',
    backgroundColor: '#0d1117',
    show: false,           // Show after ready-to-show
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,  // Security: never enable
      sandbox: false,           // Need for preload IPC
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  })

  // Load renderer
  if (isDev) {
    await mainWindow.loadURL(RENDERER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Show window once loaded (prevents flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  // Window state IPC
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window:close', () => mainWindow?.close())

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized', false))

  // External links open in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── Register All IPC Handlers ────────────────────────────────────────────────
function registerIpcHandlers() {
  registerFileSystemHandlers()
  registerProviderHandlers()
  registerCredentialHandlers()
  registerTerminalHandlers()
  registerGitHandlers()
  registerAgentHandlers()
  registerIndexerHandlers()
  registerAutocompleteHandlers()
  registerRouterHandlers()

  // App-level handlers
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:getDataDir', () => APP_DATA_DIR)

  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Open Workspace Folder',
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:openFile', async (_e, filters?: Electron.FileFilter[]) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:saveFile', async (_e, options?: Electron.SaveDialogOptions) => {
    const result = await dialog.showSaveDialog(mainWindow!, options || {})
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle('dialog:confirm', async (_e, message: string, detail?: string) => {
    const result = await dialog.showMessageBox(mainWindow!, {
      type: 'question',
      buttons: ['Cancel', 'Confirm'],
      defaultId: 1,
      cancelId: 0,
      message,
      detail,
    })
    return result.response === 1
  })

  ipcMain.handle('shell:openExternal', (_e, url: string) => shell.openExternal(url))
  ipcMain.handle('shell:showItemInFolder', (_e, path: string) => shell.showItemInFolder(path))

  ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
  ipcMain.handle('safeStorage:available', () => safeStorage.isEncryptionAvailable())
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  registerIpcHandlers()
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

