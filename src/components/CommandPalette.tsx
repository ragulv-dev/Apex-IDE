import React, { useState, useEffect, useRef } from 'react'
import { useUIStore, useWorkspaceStore, useEditorStore, useChatStore, useSettingsStore } from '../stores'
import { Search, FolderOpen, FileCode, Terminal, MessageSquare, Settings, Save, RefreshCw, X } from 'lucide-react'

interface CommandItem {
  id: string
  title: string
  category: string
  shortcut?: string
  icon: React.ReactNode
  action: () => void
}

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, setCommandPaletteOpen, toggleChat, toggleTerminal, toggleSidebar, toggleSettings } = useUIStore()
  const { setWorkspacePath, workspacePath } = useWorkspaceStore()
  const { tabs, activeTabId, saveTab } = useEditorStore()
  const { createConversation } = useChatStore()
  const { defaultProviderId, defaultModelId } = useSettingsStore()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: CommandItem[] = [
    {
      id: 'open-folder',
      title: 'File: Open Workspace Folder...',
      category: 'File',
      shortcut: 'Ctrl+O',
      icon: <FolderOpen size={14} />,
      action: async () => {
        const path = await window.electron.dialog.openFolder()
        if (path) setWorkspacePath(path)
      },
    },
    {
      id: 'save-file',
      title: 'File: Save Current File',
      category: 'File',
      shortcut: 'Ctrl+S',
      icon: <Save size={14} />,
      action: async () => {
        const active = tabs.find(t => t.id === activeTabId)
        if (active) {
          await window.electron.fs.writeFile(active.filePath, active.content)
          saveTab(active.id)
        }
      },
    },
    {
      id: 'ai-chat-new',
      title: 'AI: New Chat Session',
      category: 'AI',
      shortcut: 'Ctrl+Shift+L',
      icon: <MessageSquare size={14} />,
      action: () => {
        createConversation(defaultProviderId, defaultModelId)
      },
    },
    {
      id: 'toggle-chat',
      title: 'View: Toggle AI Chat Panel',
      category: 'View',
      shortcut: 'Ctrl+L',
      icon: <MessageSquare size={14} />,
      action: toggleChat,
    },
    {
      id: 'toggle-terminal',
      title: 'View: Toggle Terminal',
      category: 'View',
      shortcut: 'Ctrl+`',
      icon: <Terminal size={14} />,
      action: toggleTerminal,
    },
    {
      id: 'toggle-sidebar',
      title: 'View: Toggle Primary Side Bar',
      category: 'View',
      shortcut: 'Ctrl+B',
      icon: <FileCode size={14} />,
      action: toggleSidebar,
    },
    {
      id: 'open-settings',
      title: 'Preferences: Open Settings & AI Providers',
      category: 'Preferences',
      shortcut: 'Ctrl+,',
      icon: <Settings size={14} />,
      action: toggleSettings,
    },
  ]

  const filtered = commands.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        setCommandPaletteOpen(true)
      } else if (e.key === 'Escape' && commandPaletteOpen) {
        e.preventDefault()
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commandPaletteOpen, setCommandPaletteOpen])

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandPaletteOpen])

  if (!commandPaletteOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % (filtered.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + filtered.length) % (filtered.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = filtered[selectedIndex]
      if (selected) {
        selected.action()
        setCommandPaletteOpen(false)
      }
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) setCommandPaletteOpen(false)
      }}
    >
      <div
        style={{
          width: 580,
          maxHeight: 400,
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.1s ease',
        }}
      >
        {/* Search Input Bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)', marginRight: 8, flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 13,
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Results List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              No commands found
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => {
                  item.action()
                  setCommandPaletteOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: idx === selectedIndex ? 'var(--bg-active)' : 'transparent',
                  color: idx === selectedIndex ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 13,
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div style={{ color: 'var(--accent)', flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </div>
                {item.shortcut && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      padding: '2px 6px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {item.shortcut}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

