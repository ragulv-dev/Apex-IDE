import { ElectronAPI } from '../../electron/preload'

declare module '*.css'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

export {}

