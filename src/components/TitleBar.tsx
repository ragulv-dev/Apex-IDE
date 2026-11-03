import { useEffect, useRef, useState } from 'react'
import { useUIStore, useWorkspaceStore } from '../stores'
import { zoomIn, zoomOut, resetZoom } from '../utils/zoom'

interface MenuItemDef {
  label: string
  shortcut?: string
  separator?: boolean
  danger?: boolean
  action?: () => void
}

interface MenuDef {
  title: string
  items: MenuItemDef[]
}

export function TitleBar() {
  const { toggleSettings, toggleSidebar, toggleChat, toggleTerminal, setCommandPaletteOpen } = useUIStore()
  const { setWorkspacePath } = useWorkspaceStore()
  const [isMaximized, setIsMaximized] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cleanup = window.electron?.window?.onMaximized ? window.electron.window.onMaximized(setIsMaximized) : () => {}
    return () => {
      cleanup()
    }
  }, [])

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!openMenu) return

    function handleMouseDown(e: MouseEvent) {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenMenu(null)
      }
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMenu])

  async function handleOpenFolder() {
    try {
      const path = await window.electron?.dialog?.openFolder?.()
      if (path) setWorkspacePath(path)
    } catch {}
  }

  const MENUS: MenuDef[] = [
    {
      title: 'File',
      items: [
        { label: 'New File', shortcut: 'Ctrl+N', action: () => setCommandPaletteOpen(true) },
        { label: 'Open Folder...', shortcut: 'Ctrl+O', action: handleOpenFolder },
        { separator: true, label: '' },
        { label: 'Settings', shortcut: 'Ctrl+,', action: toggleSettings },
        { separator: true, label: '' },
        { label: 'Exit', shortcut: 'Alt+F4', danger: true, action: () => window.electron?.window?.close?.() },
      ],
    },
    {
      title: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => document.execCommand('undo') },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: () => document.execCommand('redo') },
        { separator: true, label: '' },
        { label: 'Cut', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
        { label: 'Paste', shortcut: 'Ctrl+V', action: () => document.execCommand('paste') },
      ],
    },
    {
      title: 'View',
      items: [
        { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: () => setCommandPaletteOpen(true) },
        { separator: true, label: '' },
        { label: 'Zoom In', shortcut: 'Ctrl + +', action: () => zoomIn() },
        { label: 'Zoom Out', shortcut: 'Ctrl + -', action: () => zoomOut() },
        { label: 'Reset Zoom', shortcut: 'Ctrl + 0', action: () => resetZoom() },
        { separator: true, label: '' },
        { label: 'Toggle Primary Sidebar', shortcut: 'Ctrl+B', action: toggleSidebar },
        { label: 'Toggle AI Chat', shortcut: 'Ctrl+L', action: toggleChat },
        { label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: toggleTerminal },
        { separator: true, label: '' },
        { label: 'Toggle Full Screen', shortcut: 'F11', action: () => window.electron?.window?.toggleFullScreen?.() },
      ],
    },
    {
      title: 'Terminal',
      items: [
        { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: toggleTerminal },
        { label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: toggleTerminal },
      ],
    },
    {
      title: 'Help',
      items: [
        { label: 'About APEX', action: toggleSettings },
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', action: toggleSettings },
      ],
    },
  ]

  return (
    <div
      className="drag-region flex items-center justify-between"
      style={{
        height: 'var(--title-bar-height)',
        background: '#010409',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        userSelect: 'none',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* Brand Logo + Name + Menu */}
      <div className="flex items-center gap-2">
        <div className="no-drag flex items-center gap-2 px-3">
          <img
            src="./brand/apex-icon.png"
            alt="APEX"
            style={{ width: 18, height: 18, objectFit: 'contain', borderRadius: 2 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '0.06em' }}>
            APEX
          </span>
        </div>

        {/* Menu bar dropdowns */}
        <div ref={menuBarRef} className="no-drag flex items-center gap-0.5 relative">
          {MENUS.map(menu => {
            const isOpen = openMenu === menu.title
            return (
              <div key={menu.title} style={{ position: 'relative' }}>
                <button
                  onClick={() => setOpenMenu(isOpen ? null : menu.title)}
                  onMouseEnter={() => {
                    if (openMenu !== null && openMenu !== menu.title) {
                      setOpenMenu(menu.title)
                    }
                  }}
                  style={{
                    background: isOpen ? 'var(--bg-active)' : 'none',
                    border: 'none',
                    color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
                    padding: '2px 8px',
                    fontSize: 12,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseOver={e => {
                    if (!isOpen) e.currentTarget.style.background = 'var(--bg-hover)'
                  }}
                  onMouseOut={e => {
                    if (!isOpen) e.currentTarget.style.background = 'none'
                  }}
                >
                  {menu.title}
                </button>

                {/* Dropdown popup */}
                {isOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      minWidth: 220,
                      background: '#0d1117',
                      border: '1px solid #30363d',
                      borderRadius: 6,
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7), 0 2px 6px rgba(0, 0, 0, 0.4)',
                      padding: '4px 0',
                      zIndex: 9999,
                      animation: 'fadeIn 0.1s ease',
                    }}
                  >
                    {menu.items.map((item, idx) => {
                      if (item.separator) {
                        return (
                          <div
                            key={idx}
                            style={{
                              height: 1,
                              background: '#21262d',
                              margin: '4px 0',
                            }}
                          />
                        )
                      }

                      return (
                        <div
                          key={item.label}
                          onClick={() => {
                            setOpenMenu(null)
                            item.action?.()
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 14px',
                            fontSize: 12,
                            color: item.danger ? '#f85149' : '#e6edf3',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = item.danger ? 'rgba(248, 81, 73, 0.15)' : '#1f242c'
                            if (!item.danger) e.currentTarget.style.color = '#ffffff'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = item.danger ? '#f85149' : '#e6edf3'
                          }}
                        >
                          <span>{item.label}</span>
                          {item.shortcut && (
                            <span style={{ fontSize: 11, color: '#8b949e', marginLeft: 24, letterSpacing: '0.02em' }}>
                              {item.shortcut}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Window controls */}
      <div className="no-drag flex items-center">
        <WinBtn onClick={() => window.electron?.window?.minimize?.()} title="Minimize">
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
        </WinBtn>
        <WinBtn onClick={() => window.electron?.window?.maximize?.()} title={isMaximized ? 'Restore' : 'Maximize'}>
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 1h6v6M1 3h6v6H1V3z" stroke="currentColor" strokeWidth="1"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor"/>
            </svg>
          )}
        </WinBtn>
        <WinBtn onClick={() => window.electron?.window?.close?.()} title="Close" danger>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </WinBtn>
      </div>
    </div>
  )
}

function WinBtn({
  onClick, title, children, danger,
}: {
  onClick: () => void; title: string; children: React.ReactNode; danger?: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? (danger ? '#e81123' : 'var(--bg-hover)') : 'transparent',
        border: 'none',
        color: hover ? (danger ? '#fff' : 'var(--text-primary)') : 'var(--text-secondary)',
        width: 46,
        height: 'var(--title-bar-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.1s, color 0.1s',
      }}
    >
      {children}
    </button>
  )
}
