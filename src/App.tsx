import { useEffect } from 'react'
import { useSettingsStore, useUIStore } from './stores'
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
import { useEditorStore } from './stores'
import { Resizer } from './components/ui/Resizer'

export default function App() {
  const { showSidebar, showChat, showTerminal, showSettings, sidebarWidth, chatPanelWidth, terminalHeight } = useUIStore()
  const { tabs } = useEditorStore()
  const { theme } = useSettingsStore()

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

        {/* Editor area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            {/* Code editor */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {tabs.length === 0 ? <WelcomeScreen /> : <EditorArea />}
            </div>

            {/* AI Chat panel */}
            {showChat && (
              <>
                <Resizer direction="x" />
                <div style={{ width: chatPanelWidth, minWidth: 280, maxWidth: 600, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <ChatPanel />
                </div>
              </>
            )}
          </div>

          {/* Terminal panel */}
          {showTerminal && (
            <>
              <Resizer direction="y" />
              <div style={{ height: terminalHeight, minHeight: 100, maxHeight: 600, overflow: 'hidden' }}>
                <TerminalPanel />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Modals / Overlays */}
      {showSettings && <SettingsModal />}
      <CommandPalette />
    </div>
  )
}

