import { useEditorStore, useSettingsStore } from '../../stores'
import { EditorTab } from '../../types'
import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import MonacoEditor, { useMonaco } from '@monaco-editor/react'
import { extToLanguage } from '../../utils/helpers'

export function EditorArea() {
  const { tabs, activeTabId, setActiveTab, closeTab, updateTabContent, saveTab, markTabDirty } = useEditorStore()
  const { fontSize, fontFamily, tabSize, wordWrap, minimap, theme, autocomplete, autocompleteDelay } = useSettingsStore()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const monacoRef = useRef<any>(null)
  const completionDisposableRef = useRef<any>(null)

  async function handleSave() {
    if (!activeTab || !activeTab.isDirty) return
    const result = await window.electron.fs.writeFile(activeTab.filePath, activeTab.content)
    if (result.ok) saveTab(activeTab.id)
  }

  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    monacoRef.current = monaco

    // Track cursor movement
    editor.onDidChangeCursorPosition((e: any) => {
      if (activeTab) {
        activeTab.cursorLine = e.position.lineNumber
        activeTab.cursorCol = e.position.column
      }
    })

    // Register inline completion provider (AI Ghost Text Autocomplete)
    if (completionDisposableRef.current) {
      completionDisposableRef.current.dispose()
    }

    if (autocomplete) {
      completionDisposableRef.current = monaco.languages.registerInlineCompletionsProvider('*', {
        provideInlineCompletions: async (model: any, position: any, _context: any, token: any) => {
          if (token.isCancellationRequested) return { items: [] }
          const offset = model.getOffsetAt(position)
          const fullText = model.getValue()
          const prefix = fullText.slice(0, offset)
          const suffix = fullText.slice(offset)

          // Short debounce
          await new Promise(r => setTimeout(r, autocompleteDelay || 350))
          if (token.isCancellationRequested) return { items: [] }

          try {
            const res = await window.electron.autocomplete.complete({
              prefix,
              suffix,
              language: model.getLanguageId(),
              filePath: activeTab?.filePath || 'unknown',
            })

            if (!res.ok || !res.text) return { items: [] }

            return {
              items: [
                {
                  insertText: res.text,
                  range: new monaco.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                  ),
                },
              ],
            }
          } catch {
            return { items: [] }
          }
        },
        freeInlineCompletions: () => {},
      })
    }
  }, [activeTab, autocomplete, autocompleteDelay])

  useEffect(() => {
    return () => {
      if (completionDisposableRef.current) {
        completionDisposableRef.current.dispose()
      }
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        background: 'var(--tab-bg)',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
        flexShrink: 0,
        height: 'var(--tab-bar-height)',
        alignItems: 'stretch',
      }}
      className="hide-scrollbar"
      >
        {tabs.map(tab => (
          <EditorTabItem
            key={tab.id}
            tab={tab}
            active={tab.id === activeTabId}
            onSelect={() => setActiveTab(tab.id)}
            onClose={() => closeTab(tab.id)}
          />
        ))}
      </div>

      {/* Monaco Editor */}
      {activeTab ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MonacoEditor
            height="100%"
            language={activeTab.language}
            value={activeTab.content}
            theme={theme === 'dark' ? 'vs-dark' : 'vs'}
            onMount={handleEditorMount}
            onChange={(value) => {
              if (value !== undefined) updateTabContent(activeTab.id, value)
            }}
            options={{
              fontSize,
              fontFamily,
              fontLigatures: true,
              tabSize,
              wordWrap: wordWrap ? 'on' : 'off',
              minimap: { enabled: minimap },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              renderLineHighlight: 'gutter',
              lineNumbers: 'on',
              glyphMargin: true,
              folding: true,
              bracketPairColorization: { enabled: true },
              padding: { top: 8, bottom: 8 },
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
              suggest: {
                showKeywords: true,
                showSnippets: true,
              },
              quickSuggestions: {
                other: true,
                comments: false,
                strings: false,
              },
              parameterHints: { enabled: true },
              autoClosingBrackets: 'languageDefined',
              autoClosingQuotes: 'languageDefined',
              formatOnPaste: false,
              formatOnType: false,
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

function EditorTabItem({ tab, active, onSelect, onClose }: {
  tab: EditorTab; active: boolean; onSelect: () => void; onClose: () => void
}) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 12px',
        background: active ? 'var(--tab-active)' : hover ? 'var(--bg-hover)' : 'transparent',
        borderRight: '1px solid var(--border)',
        borderBottom: active ? '1px solid var(--tab-active)' : '1px solid transparent',
        borderTop: active ? '1px solid var(--accent)' : '1px solid transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        cursor: 'pointer',
        flexShrink: 0,
        maxWidth: 200,
        userSelect: 'none',
        fontSize: 13,
      }}
    >
      {tab.isDirty && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-secondary)', flexShrink: 0 }} />
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {tab.fileName}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onClose() }}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          padding: 2,
          borderRadius: 3,
          cursor: 'pointer',
          flexShrink: 0,
          opacity: hover || tab.isDirty ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
      >
        <X size={12} />
      </button>
    </div>
  )
}

