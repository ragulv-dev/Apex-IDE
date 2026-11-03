import { useEffect, useRef, useState } from 'react'
import { useSettingsStore } from '../../stores'
import { nanoid } from '../../utils/nanoid'
import { detectProviderType, providerColor, formatLatency } from '../../utils/helpers'
import type { ProviderConfig, ModelConfig } from '../../types'
import {
  Plus, Trash2, RefreshCw, CheckCircle, XCircle,
  Loader, ChevronDown, ChevronRight, Eye, EyeOff, Settings,
  Cpu, Zap, Globe, Terminal as TerminalIcon,
} from 'lucide-react'
import { useUIStore } from '../../stores'

const TABS = ['Providers', 'Editor', 'AI', 'About'] as const
type Tab = typeof TABS[number]

const BUILT_IN_PROVIDERS = [
  { name: 'OpenAI', type: 'openai' as const, baseUrl: 'https://api.openai.com/v1' },
  { name: 'Anthropic', type: 'anthropic' as const, baseUrl: 'https://api.anthropic.com' },
  { name: 'Google Gemini', type: 'google' as const, baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  { name: 'Groq', type: 'openai-compatible' as const, baseUrl: 'https://api.groq.com/openai/v1' },
  { name: 'DeepSeek', type: 'openai-compatible' as const, baseUrl: 'https://api.deepseek.com/v1' },
  { name: 'Mistral', type: 'openai-compatible' as const, baseUrl: 'https://api.mistral.ai/v1' },
  { name: 'Together AI', type: 'openai-compatible' as const, baseUrl: 'https://api.together.xyz/v1' },
  { name: 'Fireworks AI', type: 'openai-compatible' as const, baseUrl: 'https://api.fireworks.ai/inference/v1' },
  { name: 'OpenRouter', type: 'openai-compatible' as const, baseUrl: 'https://openrouter.ai/api/v1' },
  { name: 'NVIDIA NIM', type: 'openai-compatible' as const, baseUrl: 'https://integrate.api.nvidia.com/v1' },
  { name: 'Cerebras', type: 'openai-compatible' as const, baseUrl: 'https://api.cerebras.ai/v1' },
  { name: 'Ollama (Local)', type: 'ollama' as const, baseUrl: 'http://localhost:11434' },
  { name: 'LM Studio (Local)', type: 'lmstudio' as const, baseUrl: 'http://localhost:1234/v1' },
]

export function SettingsModal() {
  const { toggleSettings } = useUIStore()
  const settings = useSettingsStore()
  const [activeTab, setActiveTab] = useState<Tab>('Providers')

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleSettings()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [toggleSettings])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) toggleSettings() }}
    >
      <div style={{
        width: 860, height: 600, maxWidth: '95vw', maxHeight: '90vh',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex', overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        animation: 'fadeIn 0.15s ease',
      }}>
        {/* Sidebar tabs */}
        <div style={{
          width: 170, background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          padding: '16px 0',
        }}>
          <div style={{ padding: '0 16px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Settings
          </div>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 16px', fontSize: 13,
                background: activeTab === tab ? 'var(--bg-active)' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer',
                borderLeft: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'background 0.15s',
              }}
            >
              {tab}
            </button>
          ))}
          {/* Close button at bottom of sidebar tabs */}
          <div style={{ marginTop: 'auto', padding: '12px 14px 4px' }}>
            <button
              onClick={toggleSettings}
              style={{
                width: '100%',
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-hover)'
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.borderColor = 'var(--border-focus)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-input)'
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Content area with bottom Close button */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
            {activeTab === 'Providers' && <ProvidersTab />}
            {activeTab === 'Editor' && <EditorTab />}
            {activeTab === 'AI' && <AITab />}
            {activeTab === 'About' && <AboutTab />}
          </div>

          {/* Bottom footer bar */}
          <div style={{
            padding: '10px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-sidebar)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Press <kbd style={{ padding: '1px 5px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 3, fontSize: 10 }}>Esc</kbd> to exit
            </span>
            <button
              onClick={toggleSettings}
              style={{
                padding: '6px 20px',
                fontSize: 12,
                fontWeight: 600,
                color: '#ffffff',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Providers Tab ────────────────────────────────────────────────────────────
function ProvidersTab() {
  const { providers, addProvider, updateProvider, removeProvider } = useSettingsStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedBuiltIn, setSelectedBuiltIn] = useState(BUILT_IN_PROVIDERS[0])
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAddProvider() {
    setAdding(true)
    const id = nanoid()
    const keyRef = `provider_${id}_key`

    // Store API key securely
    if (apiKey) {
      await window.electron.credentials.set(keyRef, apiKey)
    }

    const provider: ProviderConfig = {
      id,
      name: customName || selectedBuiltIn.name,
      type: selectedBuiltIn.type,
      baseUrl: customUrl || selectedBuiltIn.baseUrl,
      apiKeyRef: apiKey ? keyRef : null,
      models: [],
      defaultModel: null,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addProvider(provider)

    // Auto-fetch models
    await window.electron.providers.add(provider)
    const modelsResult = await window.electron.providers.fetchModels(id)
    if (modelsResult.ok && modelsResult.models) {
      updateProvider(id, { models: modelsResult.models })
    }

    setApiKey('')
    setCustomName('')
    setCustomUrl('')
    setShowAddForm(false)
    setAdding(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>AI Providers</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Add your own API keys. Keys are encrypted with OS-level security.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', background: 'var(--accent)',
            color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
            fontSize: 13, fontWeight: 500,
          }}
        >
          <Plus size={14} /> Add Provider
        </button>
      </div>

      {/* Add provider form */}
      {showAddForm && (
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 16,
          marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Configure New Provider</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Provider template */}
            <div>
              <Label>Provider</Label>
              <select
                value={selectedBuiltIn.name}
                onChange={e => {
                  const p = BUILT_IN_PROVIDERS.find(p => p.name === e.target.value)!
                  setSelectedBuiltIn(p)
                }}
                style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13 }}
              >
                {BUILT_IN_PROVIDERS.map(p => <option key={p.name}>{p.name}</option>)}
                <option value="custom">Custom / OpenAI-compatible</option>
              </select>
            </div>
            {/* Display name */}
            <div>
              <Label>Display Name (optional)</Label>
              <input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder={selectedBuiltIn.name}
                style={{ width: '100%', padding: '7px 10px' }}
              />
            </div>
            {/* API Key */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>API Key {selectedBuiltIn.type === 'ollama' || selectedBuiltIn.type === 'lmstudio' ? '(not required for local)' : ''}</Label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  style={{ width: '100%', padding: '7px 36px 7px 10px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                🔒 Stored encrypted using Windows Credential Manager. Never sent anywhere except the provider's API.
              </p>
            </div>
            {/* Base URL for custom */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>Base URL</Label>
              <input
                value={customUrl || selectedBuiltIn.baseUrl}
                onChange={e => setCustomUrl(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              onClick={handleAddProvider}
              disabled={adding}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', background: 'var(--accent)',
                color: '#fff', border: 'none', borderRadius: 'var(--radius)',
                cursor: adding ? 'wait' : 'pointer', fontSize: 13,
              }}
            >
              {adding ? <Loader size={13} className="animate-spin" /> : <Plus size={13} />}
              {adding ? 'Adding & fetching models...' : 'Add Provider'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              style={{
                padding: '7px 14px', background: 'none',
                color: 'var(--text-secondary)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: 13,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Provider list */}
      {providers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
          <Globe size={32} style={{ margin: '0 auto 12px' }} />
          <p>No providers configured yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {providers.map(provider => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProviderCard({ provider }: { provider: ProviderConfig }) {
  const { updateProvider, removeProvider } = useSettingsStore()
  const [testing, setTesting] = useState(false)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handleTest() {
    setTesting(true)
    // Update in electron store first
    await window.electron.providers.add(provider).catch(() => {})
    const result = await window.electron.providers.testConnection(provider.id)
    updateProvider(provider.id, {
      status: result.ok ? 'connected' : 'error',
      latency: result.latency,
      lastError: result.error,
    })
    setTesting(false)
  }

  async function handleFetchModels() {
    setFetchingModels(true)
    await window.electron.providers.add(provider).catch(() => {})
    const result = await window.electron.providers.fetchModels(provider.id)
    if (result.ok) {
      updateProvider(provider.id, { models: result.models })
    }
    setFetchingModels(false)
  }

  async function handleDelete() {
    const confirmed = await window.electron.dialog.confirm(
      `Remove "${provider.name}"?`,
      'This will also remove the stored API key.'
    )
    if (!confirmed) return
    if (provider.apiKeyRef) {
      await window.electron.credentials.delete(provider.apiKeyRef)
    }
    await window.electron.providers.delete(provider.id)
    removeProvider(provider.id)
  }

  const statusColor = provider.status === 'connected' ? 'var(--success)' : provider.status === 'error' ? 'var(--error)' : 'var(--text-muted)'

  return (
    <div style={{
      background: 'var(--bg-input)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        {/* Status dot */}
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: providerColor(provider.type), flexShrink: 0 }} />
        {/* Name */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{provider.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{provider.baseUrl}</div>
        </div>
        {/* Status */}
        {provider.status === 'connected' && (
          <span style={{ fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <CheckCircle size={11} /> Connected {provider.latency && `· ${formatLatency(provider.latency)}`}
          </span>
        )}
        {provider.status === 'error' && (
          <span style={{ fontSize: 11, color: 'var(--error)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <XCircle size={11} /> Error
          </span>
        )}
        {/* Models count */}
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{provider.models.length} models</span>
        {/* Actions */}
        <button onClick={handleTest} disabled={testing} style={iconBtnStyle} title="Test connection">
          {testing ? <Loader size={13} className="animate-spin" /> : <CheckCircle size={13} />}
        </button>
        <button onClick={handleFetchModels} disabled={fetchingModels} style={iconBtnStyle} title="Fetch models">
          {fetchingModels ? <Loader size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        </button>
        <button onClick={() => setExpanded(!expanded)} style={iconBtnStyle} title="Expand">
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <button onClick={handleDelete} style={{ ...iconBtnStyle, color: 'var(--error)' }} title="Remove">
          <Trash2 size={13} />
        </button>
      </div>
      {expanded && provider.models.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px 14px', maxHeight: 200, overflow: 'auto' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Available Models:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {provider.models.slice(0, 30).map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{m.id}</span>
                {m.supportsVision && <span title="Vision">👁</span>}
                {m.supportsToolCalling && <span title="Tool calling" style={{ color: 'var(--success)', fontSize: 10 }}>🔧</span>}
                {m.supportsReasoning && (
                  <span title="Reasoning" style={{ display: 'inline-flex' }}>
                    <Zap size={10} style={{ color: 'var(--warning)' }} />
                  </span>
                )}
              </div>
            ))}
            {provider.models.length > 30 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>...and {provider.models.length - 30} more</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Editor Tab ───────────────────────────────────────────────────────────────
function EditorTab() {
  const settings = useSettingsStore()
  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Editor</h2>
      <SettingRow label="Font Size" description="Editor font size in pixels">
        <input type="number" value={settings.fontSize} min={10} max={28} onChange={e => settings.setFontSize(+e.target.value)} style={{ width: 80, padding: '5px 8px' }} />
      </SettingRow>
      <SettingRow label="Tab Size" description="Number of spaces per tab">
        <select value={settings.tabSize} onChange={e => settings.setTabSize(+e.target.value)} style={{ padding: '5px 8px' }}>
          {[2, 4].map(n => <option key={n} value={n}>{n} spaces</option>)}
        </select>
      </SettingRow>
      <SettingRow label="Word Wrap" description="Wrap long lines">
        <Toggle value={settings.wordWrap} onChange={settings.setWordWrap} />
      </SettingRow>
      <SettingRow label="Minimap" description="Show code minimap">
        <Toggle value={settings.minimap} onChange={settings.setMinimap} />
      </SettingRow>
    </div>
  )
}

// ─── AI Tab ───────────────────────────────────────────────────────────────────
function AITab() {
  const settings = useSettingsStore()
  const allModels = settings.providers.flatMap(p => p.models.map(m => ({
    providerId: p.id,
    providerName: p.name,
    modelId: m.id,
    modelName: m.name,
  })))

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>AI Configuration & Routing</h2>
      
      {/* Fallback Model */}
      <SettingRow label="Fallback / Backup Model" description="Automatically switched to if primary provider fails (rate limit, outage)">
        <select
          value={settings.fallbackModelId || ''}
          onChange={e => {
            const chosen = allModels.find(m => m.modelId === e.target.value)
            if (chosen) {
              settings.update({ fallbackProviderId: chosen.providerId, fallbackModelId: chosen.modelId })
            } else {
              settings.update({ fallbackProviderId: null, fallbackModelId: null })
            }
          }}
          style={{ padding: '5px 8px', maxWidth: 220 }}
        >
          <option value="">None (disabled)</option>
          {allModels.map(m => (
            <option key={`${m.providerId}:${m.modelId}`} value={m.modelId}>
              {m.providerName} - {m.modelName}
            </option>
          ))}
        </select>
      </SettingRow>

      {/* Autocomplete Model */}
      <SettingRow label="Dedicated Autocomplete Model" description="Fast, lightweight model for inline ghost text completion">
        <select
          value={settings.autocompleteModelId || ''}
          onChange={e => {
            const chosen = allModels.find(m => m.modelId === e.target.value)
            if (chosen) {
              settings.setAutocompleteModel(chosen.providerId, chosen.modelId)
            } else {
              settings.setAutocompleteModel(null, null)
            }
          }}
          style={{ padding: '5px 8px', maxWidth: 220 }}
        >
          <option value="">Default model</option>
          {allModels.map(m => (
            <option key={`${m.providerId}:${m.modelId}`} value={m.modelId}>
              {m.providerName} - {m.modelName}
            </option>
          ))}
        </select>
      </SettingRow>

      <SettingRow label="Temperature" description={`Creativity level: ${settings.temperature}`}>
        <input type="range" min={0} max={1} step={0.1} value={settings.temperature}
          onChange={e => settings.setTemperature(+e.target.value)}
          style={{ width: 140 }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{settings.temperature}</span>
      </SettingRow>
      <SettingRow label="Max Output Tokens" description="Maximum response length">
        <input type="number" value={settings.maxOutputTokens} min={256} max={32000} step={256}
          onChange={e => settings.setMaxOutputTokens(+e.target.value)}
          style={{ width: 100, padding: '5px 8px' }}
        />
      </SettingRow>
      <SettingRow label="Require Approval for Commands" description="Always ask before running terminal commands">
        <Toggle value={settings.requireApprovalForCommands} onChange={v => settings.update({ requireApprovalForCommands: v })} />
      </SettingRow>
      <SettingRow label="AI Autocomplete" description="Inline code suggestions while typing">
        <Toggle value={settings.autocomplete} onChange={settings.setAutocomplete} />
      </SettingRow>
    </div>
  )
}

// ─── About Tab ────────────────────────────────────────────────────────────────
function AboutTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 0' }}>
      <img
        src="./brand/apex-icon.png"
        alt="APEX"
        style={{
          width: 96,
          height: 96,
          objectFit: 'contain',
          marginBottom: 16,
          filter: 'drop-shadow(0 12px 32px rgba(0, 102, 255, 0.35))',
        }}
      />
      <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-primary)', marginBottom: 4 }}>
        APEX
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Professional Developer IDE & Autonomous Agent Workspace
      </p>

      <div style={{
        maxWidth: 420,
        width: '100%',
        background: 'var(--bg-input)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        textAlign: 'left',
        fontSize: 13,
        color: 'var(--text-secondary)',
        lineHeight: 1.8,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Version</strong>
          <span>1.0.0 Stable</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Architecture</strong>
          <span>Electron + React 19 + Monaco Editor</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong style={{ color: 'var(--text-primary)' }}>AI Providers</strong>
          <span style={{ color: 'var(--accent)' }}>15+ Supported (BYOK)</span>
        </div>
      </div>
    </div>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{children}</div>
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{description}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: value ? 'var(--accent)' : 'var(--bg-active)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: value ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none',
  color: 'var(--text-muted)', cursor: 'pointer',
  padding: 4, display: 'flex', alignItems: 'center',
  borderRadius: 3,
}

