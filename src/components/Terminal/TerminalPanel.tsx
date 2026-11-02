import { useEffect, useRef } from 'react'
import { useUIStore } from '../../stores'

export function TerminalPanel() {
  const { terminalHeight } = useUIStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<{ term: any; fitAddon: any } | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    let cleanup: (() => void) | null = null

    async function initTerminal() {
      // Dynamically import xterm to avoid SSR issues
      const { Terminal } = await import('xterm')
      const { FitAddon } = await import('xterm-addon-fit')

      if (!containerRef.current) return

      const term = new Terminal({
        theme: {
          background: '#0d1117',
          foreground: '#e6edf3',
          cursor: '#58a6ff',
          selectionBackground: '#264f78',
          black: '#484f58',
          brightBlack: '#6e7681',
          red: '#ff7b72',
          brightRed: '#ffa198',
          green: '#3fb950',
          brightGreen: '#56d364',
          yellow: '#d29922',
          brightYellow: '#e3b341',
          blue: '#58a6ff',
          brightBlue: '#79c0ff',
          magenta: '#bc8cff',
          brightMagenta: '#d2a8ff',
          cyan: '#39d353',
          brightCyan: '#56d364',
          white: '#b1bac4',
          brightWhite: '#f0f6fc',
        },
        fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
        scrollback: 5000,
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(containerRef.current)
      fitAddon.fit()
      termRef.current = { term, fitAddon }

      // Create terminal session
      const result = await window.electron.terminal.create()
      if (!result.ok) {
        term.writeln('\r\x1b[31m[Terminal] node-pty not available. Run: npm run electron:rebuild\x1b[0m')
        return
      }

      sessionIdRef.current = result.id

      // Handle input
      term.onData((data: string) => {
        window.electron.terminal.write(result.id, data)
      })

      // Handle output from main process
      const unsubData = window.electron.terminal.onData(result.id, (data: string) => {
        term.write(data)
      })

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        try {
          fitAddon.fit()
          window.electron.terminal.resize(result.id, term.cols, term.rows)
        } catch {}
      })
      if (containerRef.current) resizeObserver.observe(containerRef.current)

      cleanup = () => {
        unsubData()
        resizeObserver.disconnect()
        if (sessionIdRef.current) {
          window.electron.terminal.kill(sessionIdRef.current)
        }
        term.dispose()
      }
    }

    initTerminal()
    return () => cleanup?.()
  }, [])

  return (
    <div style={{ height: '100%', background: 'var(--terminal-bg)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
      {/* Terminal tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 12px',
        background: 'var(--bg-sidebar)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        height: 32,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Terminal
        </span>
      </div>
      {/* Terminal container */}
      <div
        ref={containerRef}
        style={{ flex: 1, padding: '4px 8px', overflow: 'hidden' }}
      />
    </div>
  )
}

