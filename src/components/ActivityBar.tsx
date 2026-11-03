import { useState } from 'react'
import { useUIStore, useWorkspaceStore } from '../stores'
import {
  FolderOpen, Search, GitBranch, Settings, MessageSquare,
  Terminal as TerminalIcon, ChevronRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'explorer' as const, icon: FolderOpen, label: 'Explorer', shortcut: 'Ctrl+Shift+E' },
  { id: 'search' as const, icon: Search, label: 'Search', shortcut: 'Ctrl+Shift+F' },
  { id: 'git' as const, icon: GitBranch, label: 'Source Control', shortcut: 'Ctrl+Shift+G' },
]

export function ActivityBar() {
  const { activePanel, setActivePanel, showSidebar, toggleSidebar, toggleSettings, toggleChat, toggleTerminal, showChat } = useUIStore()

  function handleNavClick(id: typeof NAV_ITEMS[number]['id']) {
    if (activePanel === id && showSidebar) {
      toggleSidebar()
    } else {
      setActivePanel(id)
      if (!showSidebar) toggleSidebar()
    }
  }

  return (
    <div
      style={{
        width: 'var(--sidebar-icon-width)',
        background: '#000000',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 4,
        flexShrink: 0,
      }}
    >
      {/* Brand Icon Button */}
      <div className="w-full flex justify-center pb-2 pt-1 border-b border-[#18181b] mb-2">
        <button
          onClick={toggleSettings}
          title="APEX — Professional Developer IDE"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
          }}
        >
          <img
            src="./brand/apex-icon.png"
            alt="APEX"
            style={{ width: 22, height: 22, objectFit: 'contain' }}
          />
        </button>
      </div>

      {/* Top nav items */}
      <div className="flex flex-col gap-1 w-full items-center">
        {NAV_ITEMS.map(({ id, icon: Icon, label, shortcut }) => (
          <ActivityButton
            key={id}
            active={activePanel === id && showSidebar}
            title={`${label} (${shortcut})`}
            onClick={() => handleNavClick(id)}
          >
            <Icon size={20} />
          </ActivityButton>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col gap-1 w-full items-center mt-auto mb-2">
        <ActivityButton
          title="AI Chat (Ctrl+L)"
          active={showChat}
          onClick={toggleChat}
        >
          <MessageSquare size={20} />
        </ActivityButton>
        <ActivityButton
          title="Terminal (Ctrl+`)"
          onClick={toggleTerminal}
        >
          <TerminalIcon size={20} />
        </ActivityButton>
        <ActivityButton
          title="Settings (Ctrl+,)"
          onClick={toggleSettings}
        >
          <Settings size={20} />
        </ActivityButton>
      </div>
    </div>
  )
}

function ActivityButton({
  children, active, onClick, title,
}: {
  children: React.ReactNode; active?: boolean; onClick: () => void; title: string
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 36,
        height: 36,
        background: hover ? 'var(--bg-hover)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        color: active ? 'var(--text-primary)' : hover ? 'var(--text-secondary)' : 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'color 0.15s, background 0.15s',
      }}
    >
      {/* Active indicator */}
      {active && (
        <span style={{
          position: 'absolute',
          left: -2,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 2,
          height: 20,
          background: 'var(--accent)',
          borderRadius: '0 2px 2px 0',
        }} />
      )}
      {children}
    </button>
  )
}

