import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  dialog,
  safeStorage,
  nativeTheme,
  nativeImage,
  Menu,
  MenuItem,
} from 'electron'
import { join, resolve } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'fs'

// Set Windows AppUserModelId immediately so taskbar grouping and icon match APEX
if (process.platform === 'win32') {
  app.setAppUserModelId('com.apex.app')
}

function logDebug(msg: string) {
  try {
    const logPath = join(process.env.APPDATA || process.cwd(), 'apex-ide-debug.log')
    appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`)
  } catch {}
}

logDebug('Main module loaded')

process.on('uncaughtException', (error) => {
  logDebug(`uncaughtException: ${error?.stack || error}`)
})

process.on('unhandledRejection', (reason) => {
  logDebug(`unhandledRejection: ${reason}`)
})
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

const isDev = !app.isPackaged || process.env.NODE_ENV === 'development'
const RENDERER_URL = 'http://localhost:5173'

let mainWindow: BrowserWindow | null = null

// ─── Resolve App Icon ────────────────────────────────────────────────────────
function getAppIconPath(): string | undefined {
  const candidates = [
    join(__dirname, '../public/icon.ico'),
    join(__dirname, '../public/brand/apex-icon.ico'),
    join(__dirname, '../dist/icon.ico'),
    join(__dirname, 'icon.ico'),
    join(process.resourcesPath, 'icon.ico'),
    join(process.resourcesPath, 'public/icon.ico'),
    join(process.cwd(), 'public/icon.ico'),
    join(process.cwd(), 'public/brand/apex-icon.ico'),
    join(process.cwd(), 'dist/icon.ico'),
    join(__dirname, '../public/icon.png'),
    join(__dirname, '../dist/icon.png'),
    join(process.cwd(), 'public/icon.png'),
  ]
  return candidates.find(p => existsSync(p))
}

// ─── Window Creation ──────────────────────────────────────────────────────────
async function createWindow() {
  logDebug('createWindow() called')
  ensureAppDataDir()

  const iconPath = getAppIconPath()
  logDebug(`iconPath: ${iconPath}`)

  let appIcon: any = iconPath
  if (iconPath) {
    try {
      appIcon = nativeImage.createFromPath(iconPath)
    } catch {}
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,          // Custom title bar
    titleBarStyle: 'hidden',
    backgroundColor: '#000000',
    icon: appIcon,
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

  // Explicitly set window & taskbar icon if available
  if (appIcon) {
    try {
      mainWindow.setIcon(appIcon)
    } catch (e) {
      logDebug(`setIcon error: ${e}`)
    }
  }

  // Load renderer
  const distHtml = join(__dirname, '../dist/index.html')
  logDebug(`distHtml: ${distHtml}, exists: ${existsSync(distHtml)}, isDev: ${isDev}`)
  
  if (isDev) {
    let devServerAvailable = false
    try {
      const http = require('http')
      devServerAvailable = await new Promise<boolean>((resolve) => {
        const req = http.get(RENDERER_URL, (res: any) => {
          resolve(res.statusCode === 200 || res.statusCode === 304)
        })
        req.on('error', () => resolve(false))
        req.setTimeout(1000, () => {
          req.destroy()
          resolve(false)
        })
      })
    } catch {}

    if (devServerAvailable) {
      logDebug(`Loading RENDERER_URL: ${RENDERER_URL}`)
      await mainWindow.loadURL(RENDERER_URL)
    } else if (existsSync(distHtml)) {
      logDebug(`Loading distHtml (fallback in dev): ${distHtml}`)
      await mainWindow.loadFile(distHtml)
    } else {
      logDebug(`Fallback loading RENDERER_URL: ${RENDERER_URL}`)
      await mainWindow.loadURL(RENDERER_URL)
    }
  } else {
    if (existsSync(distHtml)) {
      logDebug(`Loading distHtml in production: ${distHtml}`)
      await mainWindow.loadFile(distHtml)
    } else {
      await mainWindow.loadURL(RENDERER_URL)
    }
  }

  // Show window once loaded (prevents flash)
  mainWindow.once('ready-to-show', () => {
    logDebug('mainWindow ready-to-show fired')
    mainWindow?.show()
    mainWindow?.focus()
  })

  // Safety fallback: ensure window is visible even if ready-to-show doesn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show()
      mainWindow.focus()
    }
  }, 1000)

  // Window state IPC
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window:close', () => mainWindow?.close())

  // Window zoom controls
  ipcMain.on('window:zoomIn', (_e, factor?: number) => {
    if (!mainWindow) return
    if (typeof factor === 'number') {
      mainWindow.webContents.setZoomFactor(factor)
    } else {
      const current = mainWindow.webContents.getZoomFactor()
      mainWindow.webContents.setZoomFactor(Math.min(Math.round((current + 0.1) * 10) / 10, 3.0))
    }
  })
  ipcMain.on('window:zoomOut', (_e, factor?: number) => {
    if (!mainWindow) return
    if (typeof factor === 'number') {
      mainWindow.webContents.setZoomFactor(factor)
    } else {
      const current = mainWindow.webContents.getZoomFactor()
      mainWindow.webContents.setZoomFactor(Math.max(Math.round((current - 0.1) * 10) / 10, 0.4))
    }
  })
  ipcMain.on('window:resetZoom', () => {
    if (!mainWindow) return
    mainWindow.webContents.setZoomFactor(1.0)
  })
  ipcMain.on('window:setZoomFactor', (_e, factor: number) => {
    if (!mainWindow) return
    mainWindow.webContents.setZoomFactor(factor)
  })
  ipcMain.on('window:toggleFullScreen', () => {
    if (!mainWindow) return
    mainWindow.setFullScreen(!mainWindow.isFullScreen())
  })

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

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock()
logDebug(`requestSingleInstanceLock: ${gotLock}`)
if (!gotLock) {
  logDebug('Single instance lock failed — quitting')
  app.quit()
} else {
  // Set explicit Windows Application User Model ID for taskbar grouping & icon
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.apex.app')
  }

  app.on('second-instance', () => {
    logDebug('second-instance triggered')
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  // ─── App Lifecycle ────────────────────────────────────────────────────────────
  app.whenReady().then(async () => {
    logDebug('app.whenReady fired')
    registerIpcHandlers()
    await createWindow()

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) await createWindow()
    })
  })

  app.on('window-all-closed', () => {
    logDebug('window-all-closed fired')
    if (process.platform !== 'darwin') app.quit()
  })
}

