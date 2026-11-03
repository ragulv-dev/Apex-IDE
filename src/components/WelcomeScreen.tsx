import React, { useState } from 'react'
import { useWorkspaceStore, useUIStore } from '../stores'

export const WelcomeScreen: React.FC = () => {
  const { setWorkspacePath } = useWorkspaceStore()
  const { toggleSettings, toggleChat, setCommandPaletteOpen } = useUIStore()

  const handleOpenFolder = async () => {
    try {
      const path = await window.electron?.dialog?.openFolder?.()
      if (path) setWorkspacePath(path)
    } catch {}
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        padding: '32px',
        color: 'var(--text-primary)',
        background: '#000000',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Background Watermark Logo */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 340,
          height: 340,
          pointerEvents: 'none',
          opacity: 0.08,
          filter: 'drop-shadow(0 0 80px rgba(0, 102, 255, 0.45))',
          zIndex: 0,
        }}
      >
        <img
          src="./brand/apex-icon.png"
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>

      {/* Foreground Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Center Logo Emblem */}
        <div style={{ marginBottom: 32 }}>
          <img
            src="./brand/apex-icon.png"
            alt="APEX"
            style={{
              width: 80,
              height: 80,
              objectFit: 'contain',
              filter: 'drop-shadow(0 8px 32px rgba(0, 102, 255, 0.35))',
            }}
          />
        </div>

        {/* Minimal Shortcut Key Guide (matching VS Code / Cursor watermark) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            width: 320,
          }}
        >
          <ShortcutRow
            label="Open Chat"
            keys={['Ctrl', 'Alt', 'I']}
            onClick={toggleChat}
          />
          <ShortcutRow
            label="Show All Commands"
            keys={['Ctrl', 'Shift', 'P']}
            onClick={() => setCommandPaletteOpen(true)}
          />
          <ShortcutRow
            label="Open Settings"
            keys={['Ctrl', ',']}
            onClick={toggleSettings}
          />
          <ShortcutRow
            label="Open Folder"
            keys={['Ctrl', 'O']}
            onClick={handleOpenFolder}
          />
        </div>
      </div>
    </div>
  )
}

function ShortcutRow({
  label,
  keys,
  onClick,
}: {
  label: string
  keys: string[]
  onClick?: () => void
}) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 8px',
        borderRadius: 6,
        cursor: onClick ? 'pointer' : 'default',
        background: hover && onClick ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
        transition: 'background 0.12s ease',
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: hover && onClick ? '#f4f4f5' : '#8b949e',
          transition: 'color 0.12s ease',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {keys.map((k, i) => (
          <React.Fragment key={i}>
            <KeyCap>{k}</KeyCap>
            {i < keys.length - 1 && (
              <span
                style={{
                  fontSize: 10,
                  color: '#52525b',
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                +
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      style={{
        background: '#18181b',
        border: '1px solid #27272a',
        borderRadius: 4,
        padding: '3px 7px',
        fontSize: 11,
        fontWeight: 500,
        color: '#e4e4e7',
        fontFamily: 'inherit',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 20,
        height: 20,
        lineHeight: 1,
      }}
    >
      {children}
    </kbd>
  )
}
