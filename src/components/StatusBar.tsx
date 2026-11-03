import React, { useEffect, useState } from 'react'
import { useEditorStore, useSettingsStore, useWorkspaceStore, useUIStore, useChatStore } from '../stores'
import { GitBranch, AlertCircle, CheckCircle, Zap, Terminal, MessageSquare, Bot } from 'lucide-react'
import { providerColor } from '../utils/helpers'

export const StatusBar: React.FC = () => {
  const { tabs, activeTabId } = useEditorStore()
  const { defaultProviderId, defaultModelId, providers } = useSettingsStore()
  const { workspacePath } = useWorkspaceStore()
  const { toggleTerminal, toggleChat, toggleSettings } = useUIStore()
  const { isStreaming } = useChatStore()

  const [gitBranch, setGitBranch] = useState<string | null>(null)

  const activeTab = tabs.find(t => t.id === activeTabId)
  const activeProvider = providers.find(p => p.id === defaultProviderId)
  const activeModel = activeProvider?.models.find(m => m.id === defaultModelId)

  useEffect(() => {
    if (!workspacePath) {
      setGitBranch(null)
      return
    }

    window.electron.git.status(workspacePath).then((res: any) => {
      if (res.ok && res.branch) {
        setGitBranch(res.branch)
      } else {
        setGitBranch(null)
      }
    }).catch(() => setGitBranch(null))
  }, [workspacePath])

  return (
    <div
      style={{
        height: 'var(--status-bar-height)',
        background: '#000000',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        fontSize: 11,
        color: 'var(--text-secondary)',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Left section: Git, Errors, AI status */}
      <div className="flex items-center gap-3">
        {gitBranch && (
          <button
            onClick={() => {}}
            style={itemBtnStyle}
            title={`Current Branch: ${gitBranch}`}
          >
            <GitBranch size={12} />
            <span>{gitBranch}</span>
          </button>
        )}

        <button onClick={toggleTerminal} style={itemBtnStyle} title="Toggle Terminal">
          <Terminal size={12} />
        </button>

        {isStreaming ? (
          <div className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>AI generating...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
            <CheckCircle size={11} />
            <span>Ready</span>
          </div>
        )}
      </div>

      {/* Right section: Position, Encoding, Language, Model */}
      <div className="flex items-center gap-3">
        {activeTab && (
          <>
            <span style={{ cursor: 'default' }}>
              Ln {activeTab.cursorLine || 1}, Col {activeTab.cursorCol || 1}
            </span>
            <span style={{ cursor: 'default' }}>UTF-8</span>
            <span style={{ cursor: 'default', textTransform: 'capitalize' }}>
              {activeTab.language}
            </span>
          </>
        )}

        {/* AI Model quick-indicator */}
        <button
          onClick={toggleSettings}
          style={itemBtnStyle}
          title="Active AI Provider & Model (Click to open settings)"
        >
          {activeProvider ? (
            <>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: providerColor(activeProvider.type),
                  display: 'inline-block',
                }}
              />
              <span>{activeProvider.name} {activeModel ? `(${activeModel.name})` : ''}</span>
            </>
          ) : (
            <>
              <Bot size={12} />
              <span>Configure AI</span>
            </>
          )}
        </button>

        <button onClick={toggleChat} style={itemBtnStyle} title="Toggle AI Chat">
          <MessageSquare size={12} />
        </button>
      </div>
    </div>
  )
}

const itemBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'inherit',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 4px',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}

