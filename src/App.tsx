import { useEffect } from 'react'
import { useSettingsStore, useUIStore, useWorkspaceStore } from './stores'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { ActivityBar } from './components/ActivityBar'
import { EditorArea } from './components/Editor/EditorArea'
import { ChatPanel } from './components/Chat/ChatPanel'
import { StatusBar } from './components/StatusBar'
import { TerminalPanel } from './components/Terminal/TerminalPanel'
import { SettingsModal } from './components/Settings/SettingsModal'
import { CommandPalette } from './components/CommandPalette'
import { WelcomeScreen } from './components/WelcomeScreen'
import { SplashScreen } from './components/SplashScreen'
import { ZoomBadge } from './components/ui/ZoomBadge'
import { initZoom, zoomIn, zoomOut, resetZoom } from './utils/zoom'
import { useEditorStore } from './stores'
import { Resizer } from './components/ui/Resizer'

export default function App() {
  const { showSidebar, showChat, showTerminal, showSettings, sidebarWidth, chatPanelWidth, terminalHeight, toggleSidebar, toggleChat, toggleTerminal, toggleSettings } = useUIStore()
  const { tabs } = useEditorStore()
  const { theme } = useSettingsStore()

  // Initialize zoom level from storage
  useEffect(() => {
    initZoom()
  }, [])

  // Global keyboard shortcuts (Zoom In, Zoom Out, Reset Zoom, Sidebars)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Zoom In: Ctrl + = or Ctrl + + or Ctrl + NumpadAdd
        if (
          e.key === '=' ||
          e.key === '+' ||
          e.code === 'Equal' ||
          e.code === 'NumpadAdd' ||
          (e.shiftKey && (e.key === '+' || e.code === 'Equal'))
        ) {
          e.preventDefault()
          e.stopPropagation()
          zoomIn()
          return
        }

        // Zoom Out: Ctrl + - or Ctrl + _ or Ctrl + NumpadSubtract
        if (
          e.key === '-' ||
          e.key === '_' ||
          e.code === 'Minus' ||
          e.code === 'NumpadSubtract'
        ) {
          e.preventDefault()
          e.stopPropagation()
          zoomOut()
          return
        }

        // Reset Zoom: Ctrl + 0 or Ctrl + Numpad0
        if (
          e.key === '0' ||
          e.code === 'Digit0' ||
          e.code === 'Numpad0'
        ) {
          e.preventDefault()
          e.stopPropagation()
          resetZoom()
          return
        }

        // Toggle Sidebar: Ctrl + B
        if (e.key === 'b' || e.key === 'B') {
          e.preventDefault()
          toggleSidebar()
          return
        }

        // Toggle Chat: Ctrl + L or Ctrl + Alt + I
        if ((e.key === 'l' || e.key === 'L') || (e.altKey && (e.key === 'i' || e.key === 'I'))) {
          e.preventDefault()
          toggleChat()
          return
        }

        // Open Folder: Ctrl + O
        if (e.key === 'o' || e.key === 'O') {
          e.preventDefault()
          window.electron?.dialog?.openFolder?.().then((path: string | null) => {
            if (path) useWorkspaceStore.getState().setWorkspacePath(path)
          })
          return
        }

        // Show All Commands: Ctrl + Shift + P
        if (e.shiftKey && (e.key === 'p' || e.key === 'P')) {
          e.preventDefault()
          useUIStore.getState().setCommandPaletteOpen(true)
          return
        }

        // Toggle Terminal: Ctrl + `
        if (e.key === '`') {
          e.preventDefault()
          toggleTerminal()
          return
        }

        // Settings: Ctrl + ,
        if (e.key === ',') {
          e.preventDefault()
          toggleSettings()
          return
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true })
    }
  }, [toggleSidebar, toggleChat, toggleTerminal, toggleSettings])

  // Apply theme class to html element
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: 'var(--bg-base)', overflow: 'hidden' }}>
      {/* Custom title bar */}
      <TitleBar />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity bar (leftmost icon strip) */}
        <ActivityBar />

        {/* File explorer / search sidebar */}
        {showSidebar && (
          <>
            <div style={{ width: sidebarWidth, minWidth: 160, maxWidth: 500, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Sidebar />
            </div>
            <Resizer direction="x" />
          </>
        )}

        {/* Center column: Code Editor + Terminal (Terminal lives ONLY beneath the editor) */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Code editor */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {tabs.length === 0 ? <WelcomeScreen /> : <EditorArea />}
          </div>

          {/* Terminal panel (docked ONLY under editor, completely isolated from AI Chat panel) */}
          {showTerminal && (
            <>
              <Resizer direction="y" />
              <div style={{ height: terminalHeight, minHeight: 100, maxHeight: 600, overflow: 'hidden' }}>
                <TerminalPanel />
              </div>
            </>
          )}
        </div>

        {/* AI Chat panel (Full Height column on the right side, immune to terminal open/close) */}
        {showChat && (
          <>
            <Resizer direction="x" />
            <div style={{ width: chatPanelWidth, minWidth: 280, maxWidth: 800, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <ChatPanel />
            </div>
          </>
        )}
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Modals / Overlays */}
      {showSettings && <SettingsModal />}
      <CommandPalette />
      <ZoomBadge />
      <SplashScreen durationMs={1100} />
    </div>
  )
}

