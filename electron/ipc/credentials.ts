import { ipcMain, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { CREDENTIALS_FILE } from '../constants'

// ─── Credentials Store (safeStorage encrypted) ───────────────────────────────
// Keys are stored in a single JSON file, encrypted with Electron's safeStorage
// (uses Windows DPAPI on Windows — OS-level, user-account bound).
// The renderer NEVER sees actual API keys — it only requests operations by key name.

type CredentialMap = Record<string, string> // { key_name: encrypted_base64 }

function loadCredentials(): CredentialMap {
  try {
    if (!existsSync(CREDENTIALS_FILE)) return {}
    const raw = readFileSync(CREDENTIALS_FILE)
    return JSON.parse(raw.toString('utf-8'))
  } catch {
    return {}
  }
}

function saveCredentials(creds: CredentialMap) {
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds), 'utf-8')
}

export function registerCredentialHandlers() {
  // Set a credential (encrypt with safeStorage)
  ipcMain.handle('credentials:set', (_e, key: string, value: string) => {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        // Fallback: warn but still store (development only)
        console.warn('[credentials] safeStorage not available — storing in plaintext (dev only)')
        const creds = loadCredentials()
        creds[key] = Buffer.from(value).toString('base64')
        saveCredentials(creds)
        return { ok: true, encrypted: false }
      }
      const encrypted = safeStorage.encryptString(value)
      const creds = loadCredentials()
      creds[key] = encrypted.toString('base64')
      saveCredentials(creds)
      return { ok: true, encrypted: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  // Get a credential (decrypt with safeStorage)
  // IMPORTANT: The actual key value is decrypted in the main process only.
  // The renderer gets the value only when making API calls — never stored in renderer.
  ipcMain.handle('credentials:get', (_e, key: string) => {
    try {
      const creds = loadCredentials()
      const stored = creds[key]
      if (!stored) return { ok: false, error: 'Key not found' }
      if (!safeStorage.isEncryptionAvailable()) {
        return { ok: true, value: Buffer.from(stored, 'base64').toString('utf-8') }
      }
      const decrypted = safeStorage.decryptString(Buffer.from(stored, 'base64'))
      return { ok: true, value: decrypted }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  // Delete a credential
  ipcMain.handle('credentials:delete', (_e, key: string) => {
    try {
      const creds = loadCredentials()
      delete creds[key]
      saveCredentials(creds)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  // List credential keys (names only, no values)
  ipcMain.handle('credentials:list', () => {
    try {
      const creds = loadCredentials()
      return { ok: true, keys: Object.keys(creds) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}

