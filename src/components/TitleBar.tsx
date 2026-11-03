import { useEffect, useRef, useState } from 'react'
import { useUIStore } from '../stores'

export function TitleBar() {
  const { toggleSettings } = useUIStore()
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const cleanup = window.electron.window.onMaximized(setIsMaximized)
    return () => {
      cleanup()
    }
  }, [])

  return (
    <div
      className="drag-region flex items-center justify-between"
      style={{
        height: 'var(--title-bar-height)',
        background: '#010409',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Brand Logo + Name */}
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

      {/* Centered menu shortcuts */}
      <div className="no-drag flex items-center gap-1">
        {['File', 'Edit', 'View', 'Terminal', 'Help'].map(item => (
          <button
            key={item}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              padding: '2px 8px',
              fontSize: 12,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Window controls */}
      <div className="no-drag flex items-center">
        <WinBtn onClick={() => window.electron.window.minimize()} title="Minimize">
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
        </WinBtn>
        <WinBtn onClick={() => window.electron.window.maximize()} title={isMaximized ? 'Restore' : 'Maximize'}>
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
        <WinBtn onClick={() => window.electron.window.close()} title="Close" danger>
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

