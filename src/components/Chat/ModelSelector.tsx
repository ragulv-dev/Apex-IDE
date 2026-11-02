import { useState } from 'react'
import { useSettingsStore, useChatStore } from '../../stores'
import { ChevronDown, Zap } from 'lucide-react'
import { providerColor } from '../../utils/helpers'

interface ModelSelectorProps {
  providerId: string | null
  modelId: string | null
  conversationId: string | null
}

export function ModelSelector({ providerId, modelId, conversationId }: ModelSelectorProps) {
  const { providers, setDefaultModel } = useSettingsStore()
  const { updateConversationModel } = useChatStore()
  const [open, setOpen] = useState(false)

  const activeProvider = providers.find(p => p.id === providerId)
  const activeModel = activeProvider?.models.find(m => m.id === modelId)

  function handleSelect(pId: string, mId: string) {
    setDefaultModel(pId, mId)
    if (conversationId) updateConversationModel(conversationId, pId, mId)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 8px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          fontSize: 12,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {activeProvider && (
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: providerColor(activeProvider.type),
            flexShrink: 0,
          }} />
        )}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeModel ? `${activeProvider?.name} / ${activeModel.name}` : 'Select a model...'}
        </span>
        <ChevronDown size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 100,
            maxHeight: 300,
            overflow: 'auto',
          }}>
            {providers.filter(p => p.enabled && p.models.length > 0).length === 0 ? (
              <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                No providers configured.<br />Open Settings (Ctrl+,) to add one.
              </div>
            ) : (
              providers.filter(p => p.enabled && p.models.length > 0).map(provider => (
                <div key={provider.id}>
                  <div style={{
                    padding: '6px 10px 3px',
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: providerColor(provider.type) }} />
                    {provider.name}
                  </div>
                  {provider.models.slice(0, 20).map(model => (
                    <div
                      key={model.id}
                      onClick={() => handleSelect(provider.id, model.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px 6px 22px',
                        cursor: 'pointer',
                        background: model.id === modelId && provider.id === providerId ? 'var(--bg-active)' : 'transparent',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = model.id === modelId && provider.id === providerId ? 'var(--bg-active)' : 'transparent'}
                    >
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {model.name}
                      </span>
                      {model.supportsReasoning && (
                        <span title="Reasoning" style={{ display: 'inline-flex' }}>
                          <Zap size={10} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                        </span>
                      )}
                      {model.supportsVision && (
                        <span style={{ fontSize: 9, color: 'var(--info)', flexShrink: 0 }}>👁</span>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

