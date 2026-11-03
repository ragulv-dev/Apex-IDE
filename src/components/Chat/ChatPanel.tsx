import { useEffect, useRef, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useChatStore, useSettingsStore, useWorkspaceStore, useUIStore } from '../../stores'
import { Message, AgentMode } from '../../types'
import { nanoid } from '../../utils/nanoid'
import { ModelSelector } from './ModelSelector'
import { agentEngine, AGENT_TOOLS_SCHEMA } from '../../engine/agent'
import {
  Send, StopCircle, Plus, Trash2, Copy, Check,
  Bot, User, Terminal as TerminalIcon, FileCode,
  Paperclip, RotateCcw, Sparkles, Compass, ShieldAlert,
  Search, Settings
} from 'lucide-react'

export function ChatPanel() {
  const {
    conversations, activeConversationId, isStreaming, streamingContent,
    createConversation, addMessage, setStreaming, appendStreamChunk,
    finalizeStream, clearStreamBuffer, setActiveConversation, deleteConversation,
  } = useChatStore()
  const { 
    defaultProviderId, defaultModelId, providers, temperature, maxOutputTokens,
    fallbackProviderId, fallbackModelId, agentMode, setAgentMode
  } = useSettingsStore()
  const { workspacePath } = useWorkspaceStore()
  const { toggleSettings, setCommandPaletteOpen } = useUIStore()

  const [input, setInput] = useState('')
  const [cancelStream, setCancelStream] = useState<(() => void) | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeConversation = conversations.find(c => c.id === activeConversationId)
  const providerId = activeConversation?.providerId || defaultProviderId
  const modelId = activeConversation?.modelId || defaultModelId

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages, streamingContent])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  const ensureConversation = useCallback(() => {
    if (!activeConversationId) {
      return createConversation(providerId, modelId)
    }
    return activeConversationId
  }, [activeConversationId, createConversation, providerId, modelId])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    if (!providerId || !modelId) {
      alert('Please configure an AI provider in Settings first (Ctrl+,)')
      return
    }

    const convId = ensureConversation()
    setInput('')

    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    }
    addMessage(convId, userMessage)

    const assistantMessage: Message = {
      id: nanoid(),
      role: 'assistant',
      content: '',
      model: modelId,
      providerId: providerId,
      timestamp: Date.now(),
    }
    addMessage(convId, assistantMessage)
    setStreaming(true)

    // Retrieve relevant context from project indexer
    let contextSnippets = ''
    if (workspacePath) {
      try {
        const res = await window.electron.indexer.getRelevantContext(trimmed, 2000)
        if (res.ok && res.context) {
          contextSnippets = res.context
        }
      } catch {}
    }

    // Build system prompt based on mode
    const systemPrompt = `${agentEngine.getSystemPrompt(agentMode, workspacePath)}\n\n${contextSnippets}`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(activeConversation?.messages || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: trimmed },
    ]

    const startStreaming = (targetProviderId: string, targetModelId: string, isFallbackAttempt = false) => {
      const cancel = window.electron.providers.streamChat(
        {
          providerId: targetProviderId,
          modelId: targetModelId,
          messages,
          tools: agentMode === 'agent' ? AGENT_TOOLS_SCHEMA : undefined,
          temperature,
          maxTokens: maxOutputTokens,
        },
        (chunk) => appendStreamChunk(chunk),
        () => {
          finalizeStream(convId, assistantMessage.id)
          setCancelStream(null)
        },
        async (err) => {
          // Fallback logic
          if (!isFallbackAttempt && fallbackProviderId && fallbackModelId && (fallbackProviderId !== targetProviderId || fallbackModelId !== targetModelId)) {
            appendStreamChunk(`\n\n> ⚠️ **Provider error:** \`${err}\`.\n> 🔄 *Automatically switching to configured backup model:* **${fallbackModelId}**...\n\n`)
            startStreaming(fallbackProviderId, fallbackModelId, true)
          } else {
            finalizeStream(convId, assistantMessage.id)
            setCancelStream(null)
            console.error('Stream error:', err)
          }
        }
      )
      setCancelStream(() => cancel)
    }

    startStreaming(providerId, modelId)
  }, [input, isStreaming, providerId, modelId, ensureConversation, workspacePath, temperature, maxOutputTokens, agentMode, fallbackProviderId, fallbackModelId, activeConversation])

  function handleStop() {
    cancelStream?.()
    clearStreamBuffer()
    setCancelStream(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border)' }}>
      {/* Header with Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div className="flex items-center gap-1">
          {(['ask', 'plan', 'agent'] as AgentMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setAgentMode(mode)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                background: agentMode === mode ? 'var(--accent)' : 'transparent',
                color: agentMode === mode ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <IconBtn title="Search in Project / Command Palette (Ctrl+P)" onClick={() => setCommandPaletteOpen(true)}>
            <Search size={14} />
          </IconBtn>
          <IconBtn
            title={`Agent Mode: ${agentMode.toUpperCase()} (Click to cycle)`}
            onClick={() => {
              const modes: AgentMode[] = ['ask', 'plan', 'agent']
              const next = modes[(modes.indexOf(agentMode) + 1) % modes.length]
              setAgentMode(next)
            }}
          >
            <Bot size={14} style={{ color: agentMode === 'agent' ? '#00D9FF' : undefined }} />
          </IconBtn>
          <IconBtn title="AI Settings & API Keys (Ctrl+,)" onClick={toggleSettings}>
            <Settings size={14} />
          </IconBtn>
          <IconBtn title="New Conversation" onClick={() => createConversation(providerId, modelId)}>
            <Plus size={14} />
          </IconBtn>
        </div>
      </div>

      {/* Model selector */}
      <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <ModelSelector
          providerId={providerId}
          modelId={modelId}
          conversationId={activeConversationId}
        />
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 0' }}>
        {!activeConversation || activeConversation.messages.length === 0 ? (
          <EmptyChat />
        ) : (
          <>
            {activeConversation.messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isStreaming && streamingContent && (
              <MessageBubble
                message={{ id: 'streaming', role: 'assistant', content: streamingContent, timestamp: Date.now() }}
                streaming
              />
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI... (Enter to send, Shift+Enter for new line)"
            disabled={isStreaming}
            style={{
              width: '100%',
              minHeight: 60,
              maxHeight: 200,
              resize: 'none',
              background: 'transparent',
              border: 'none',
              padding: '10px 12px',
              color: 'var(--text-primary)',
              fontSize: 13,
              lineHeight: 1.5,
              fontFamily: 'var(--font-ui)',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1">
              <IconBtn title="Attach file" onClick={() => {}}>
                <Paperclip size={14} />
              </IconBtn>
              <IconBtn title="Reference workspace file" onClick={() => {}}>
                <FileCode size={14} />
              </IconBtn>
            </div>
            {isStreaming ? (
              <button
                onClick={handleStop}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--error)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-sm)',
                  padding: '5px 12px', fontSize: 12, cursor: 'pointer',
                }}
              >
                <StopCircle size={13} /> Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: input.trim() ? 'var(--accent)' : 'var(--bg-active)',
                  color: input.trim() ? '#fff' : 'var(--text-muted)',
                  border: 'none', borderRadius: 'var(--radius-sm)',
                  padding: '5px 12px', fontSize: 12, cursor: input.trim() ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
              >
                <Send size={13} /> Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message, streaming }: { message: Message; streaming?: boolean }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        animation: 'fadeIn 0.15s ease',
      }}
    >
      {/* Role label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 20, height: 20,
          borderRadius: '50%',
          background: isUser ? 'var(--accent)' : 'var(--bg-active)',
          color: isUser ? '#fff' : 'var(--text-secondary)',
          flexShrink: 0,
        }}>
          {isUser ? <User size={11} /> : <Bot size={11} />}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
          {isUser ? 'You' : message.model || 'Assistant'}
        </span>
        {streaming && (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 1s infinite' }} />
        )}
        {!isUser && !streaming && (
          <button
            onClick={handleCopy}
            title="Copy"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
          >
            {copied ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
          </button>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          marginLeft: 26,
          color: 'var(--text-primary)',
          fontSize: 13,
          lineHeight: 1.6,
        }}
        className="prose"
      >
        {isUser ? (
          <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              code({ node, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '')
                const isBlock = match !== null
                if (isBlock) {
                  return (
                    <div style={{ position: 'relative' }}>
                      <pre>
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  )
                }
                return <code {...props}>{children}</code>
              },
            }}
          >
            {message.content || (streaming ? '▋' : '')}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}

function EmptyChat() {
  return (
    <div style={{ padding: '24px 16px', textAlign: 'center' }}>
      <Bot size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
        Ask anything about your code
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>
        Configure a provider in Settings to get started
      </p>
    </div>
  )
}

function buildSystemPrompt(workspacePath: string | null): string {
  return `You are APEX AI — the official intelligence engine of the APEX IDE. 
${workspacePath ? `The user's current workspace is: ${workspacePath}` : 'No workspace is currently open.'}

You help with:
- Writing, editing, and reviewing code
- Explaining concepts and debugging errors
- Generating tests and documentation
- Analyzing project architecture

Always provide clear, concise, accurate responses. Format code with proper syntax highlighting.
When suggesting file changes, show the complete relevant code block.`
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'none', border: 'none',
        color: 'var(--text-muted)', padding: '4px',
        borderRadius: 3, cursor: 'pointer',
        display: 'flex', alignItems: 'center',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none' }}
    >
      {children}
    </button>
  )
}

