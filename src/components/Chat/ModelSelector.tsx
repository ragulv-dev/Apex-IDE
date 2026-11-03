import { useState } from 'react'
import { useSettingsStore, useChatStore } from '../../stores'
import { ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { providerColor } from '../../utils/helpers'

interface ModelSelectorProps {
  providerId: string | null
  modelId: string | null
  conversationId: string | null
  direction?: 'up' | 'down'
  compact?: boolean
}

export function ModelSelector({
  providerId,
  modelId,
  conversationId,
  direction = 'up',
  compact = true,
}: ModelSelectorProps) {
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

  const ArrowIcon = direction === 'up' && open ? ChevronDown : direction === 'up' ? ChevronUp : open ? ChevronUp : ChevronDown

  return (
    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
      <button
        onClick={() => setOpen(!open)}
        title={activeModel ? `${activeProvider?.name} / ${activeModel.name}` : 'Select an AI model'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          background: open ? 'var(--bg-active)' : 'var(--bg-base)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: activeModel ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: 11,
          fontWeight: 500,
          cursor: 'pointer',
          textAlign: 'left',
          maxWidth: compact ? 190 : '100%',
          transition: 'all 0.12s ease',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.background = 'var(--bg-hover)'
            e.currentTarget.style.borderColor = 'var(--border-focus)'
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.background = 'var(--bg-base)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }
        }}
      >
        {activeProvider ? (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: providerColor(activeProvider.type),
              flexShrink: 0,
              boxShadow: `0 0 6px ${providerColor(activeProvider.type)}`,
            }}
          />
        ) : (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--text-muted)',
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activeModel ? activeModel.name : 'Select model...'}
        </span>
        <ArrowIcon size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              ...(direction === 'up'
                ? { bottom: '100%', marginBottom: 6, left: 0 }
                : { top: '100%', marginTop: 6, left: 0 }),
              width: 270,
              maxWidth: '90vw',
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: 6,
              boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.7), 0 2px 8px rgba(0, 0, 0, 0.4)',
              zIndex: 1000,
              maxHeight: 280,
              overflowY: 'auto',
              animation: 'fadeIn 0.12s ease',
            }}
          >
            {providers.filter(p => p.enabled && p.models.length > 0).length === 0 ? (
              <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', lineHeight: 1.5 }}>
                No models configured.<br />Add API keys in Settings (Ctrl+,).
              </div>
            ) : (
              providers
                .filter(p => p.enabled && p.models.length > 0)
                .map(provider => (
                  <div key={provider.id}>
                    <div
                      style={{
                        padding: '6px 10px 3px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        borderTop: '1px solid #21262d',
                        background: '#161b22',
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: providerColor(provider.type),
                        }}
                      />
                      {provider.name}
                    </div>
                    {provider.models.slice(0, 25).map(model => {
                      const isSelected = model.id === modelId && provider.id === providerId
                      return (
                        <div
                          key={model.id}
                          onClick={() => handleSelect(provider.id, model.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px 6px 18px',
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(0, 102, 255, 0.18)' : 'transparent',
                            color: isSelected ? '#ffffff' : '#c9d1d9',
                            fontSize: 12,
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) e.currentTarget.style.background = '#1f242c'
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: isSelected ? 600 : 400,
                            }}
                          >
                            {model.name}
                          </span>
                          {model.supportsReasoning && (
                            <span title="Reasoning model" style={{ display: 'inline-flex' }}>
                              <Zap size={11} style={{ color: '#e3b341', flexShrink: 0 }} />
                            </span>
                          )}
                          {model.supportsVision && (
                            <span title="Vision supported" style={{ fontSize: 10, color: '#58a6ff', flexShrink: 0 }}>
                              👁
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
