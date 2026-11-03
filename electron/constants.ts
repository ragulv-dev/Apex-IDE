import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

export const APP_DATA_DIR = join(
  typeof app !== 'undefined' && app?.getPath ? app.getPath('userData') : (process.env.APPDATA || process.cwd()),
  'apex-ide'
)

export const SETTINGS_FILE = join(APP_DATA_DIR, 'settings.json')
export const CREDENTIALS_FILE = join(APP_DATA_DIR, 'credentials.enc')

export function ensureAppDataDir() {
  if (!existsSync(APP_DATA_DIR)) {
    mkdirSync(APP_DATA_DIR, { recursive: true })
  }
}

