import React from 'react'
import { useWorkspaceStore, useUIStore, useSettingsStore, useChatStore } from '../stores'
import { FolderOpen, FileCode, Bot, Settings, Terminal, Sparkles, Plus, Command } from 'lucide-react'

export const WelcomeScreen: React.FC = () => {
  const { setWorkspacePath } = useWorkspaceStore()
  const { toggleSettings, toggleChat, toggleTerminal, setCommandPaletteOpen } = useUIStore()
  const { createConversation } = useChatStore()
  const { defaultProviderId, defaultModelId } = useSettingsStore()

  const handleOpenFolder = async () => {
    const path = await window.electron.dialog.openFolder()
    if (path) setWorkspacePath(path)
  }

  const handleNewChat = () => {
    createConversation(defaultProviderId, defaultModelId)
    toggleChat()
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '32px',
        color: 'var(--text-primary)',
        background: 'radial-gradient(circle at 50% 30%, rgba(56, 139, 253, 0.05), transparent 70%), var(--bg-base)',
        overflowY: 'auto',
      }}
    >
      <div style={{ maxWidth: 640, width: '100%', textAlign: 'center' }}>
        {/* Logo / Badge */}
        <div className="flex justify-center mb-4">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #1f6feb 0%, #388bfd 50%, #58a6ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(56, 139, 253, 0.3)',
            }}
          >
            <Sparkles size={28} color="#ffffff" />
          </div>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
          Apex IDE
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>
          Universal AI-Powered Desktop IDE & Agent Workspace
        </p>

        {/* Quick action grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 32 }}>
          <ActionButton
            icon={<FolderOpen size={18} />}
            title="Open Folder"
            desc="Open a local directory or project"
            onClick={handleOpenFolder}
          />
          <ActionButton
            icon={<Bot size={18} />}
            title="Start AI Chat"
            desc="Prompt, brainstorm or refactor code"
            onClick={handleNewChat}
          />
          <ActionButton
            icon={<Settings size={18} />}
            title="Configure AI Providers"
            desc="Add BYOK keys: Claude, GPT, Gemini, Ollama..."
            onClick={toggleSettings}
          />
          <ActionButton
            icon={<Command size={18} />}
            title="Command Palette"
            desc="Quick access to all actions (Ctrl+Shift+P)"
            onClick={() => setCommandPaletteOpen(true)}
          />
        </div>

        {/* Supported AI Providers Pills */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Universal Provider Support (BYOK)
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              'OpenAI GPT-4o', 'Claude 3.7 Sonnet', 'Gemini 2.5 Flash / Pro', 
              'DeepSeek V3 / R1', 'Groq LPU', 'Ollama (Local)', 
              'LM Studio (Local)', 'Mistral', 'Qwen 2.5', 'Together AI'
            ].map(name => (
              <span
                key={name}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionButton({ icon, title, desc, onClick }: {
  icon: React.ReactNode; title: string; desc: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        color: 'var(--text-primary)',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-focus)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ color: 'var(--accent)', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {desc}
        </div>
      </div>
    </button>
  )
}
