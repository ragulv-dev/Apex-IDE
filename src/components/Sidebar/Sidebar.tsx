import { useEffect, useState, useCallback } from 'react'
import { useWorkspaceStore, useEditorStore, useUIStore } from '../../stores'
import { FileNode } from '../../types'
import { extToLanguage } from '../../utils/helpers'
import { nanoid } from '../../utils/nanoid'
import {
  FolderOpen, Folder, File, ChevronRight, ChevronDown,
  FilePlus, FolderPlus, RefreshCw, Search,
} from 'lucide-react'
import { extname, basename } from '../../utils/path'

export function Sidebar() {
  const { workspacePath, fileTree, setFileTree, toggleFolder, setWorkspacePath } = useWorkspaceStore()
  const { openFile } = useEditorStore()
  const { activePanel } = useUIStore()
  const [loading, setLoading] = useState(false)

  const loadTree = useCallback(async () => {
    if (!workspacePath) return
    setLoading(true)
    const result = await window.electron.fs.getWorkspaceTree(workspacePath)
    if (result.ok) setFileTree(result.tree)
    setLoading(false)
  }, [workspacePath, setFileTree])

  useEffect(() => {
    loadTree()
  }, [loadTree])

  // Watch for changes
  useEffect(() => {
    if (!workspacePath) return
    window.electron.fs.watchWorkspace(workspacePath)
    const cleanup = window.electron.fs.onFileChanged(() => {
      // Debounce reload
      setTimeout(loadTree, 500)
    })
    return () => {
      cleanup()
    }
  }, [workspacePath, loadTree])

  async function handleOpenFolder() {
    const path = await window.electron.dialog.openFolder()
    if (path) setWorkspacePath(path)
  }

  async function handleOpenFile(node: FileNode) {
    if (node.type === 'directory') {
      toggleFolder(node.path)
      return
    }
    const result = await window.electron.fs.readFile(node.path)
    if (!result.ok) return
    const ext = extname(node.name)
    openFile({
      id: nanoid(),
      filePath: node.path,
      fileName: node.name,
      content: result.content,
      originalContent: result.content,
      language: extToLanguage(ext),
      isDirty: false,
    })
  }

  return (
    <div style={{ height: '100%', background: 'var(--bg-sidebar)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {activePanel === 'search' ? 'Search' : activePanel === 'git' ? 'Source Control' : 'Explorer'}
        </span>
        <div className="flex items-center gap-1">
          <IconBtn title="New File" onClick={() => {}}>
            <FilePlus size={14} />
          </IconBtn>
          <IconBtn title="New Folder" onClick={() => {}}>
            <FolderPlus size={14} />
          </IconBtn>
          <IconBtn title="Refresh" onClick={loadTree}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </IconBtn>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {!workspacePath ? (
          <EmptyState onOpen={handleOpenFolder} />
        ) : fileTree.length === 0 && !loading ? (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
            Empty folder
          </div>
        ) : (
          <FileTree nodes={fileTree} depth={0} onOpen={handleOpenFile} />
        )}
      </div>

      {/* Open folder button when no workspace */}
      {!workspacePath && (
        <div style={{ padding: '12px', flexShrink: 0 }}>
          <button
            onClick={handleOpenFolder}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Open Folder
          </button>
        </div>
      )}
    </div>
  )
}

function FileTree({ nodes, depth, onOpen }: { nodes: FileNode[]; depth: number; onOpen: (node: FileNode) => void }) {
  return (
    <>
      {nodes.map(node => (
        <FileTreeNode key={node.path} node={node} depth={depth} onOpen={onOpen} />
      ))}
    </>
  )
}

function FileTreeNode({ node, depth, onOpen }: { node: FileNode; depth: number; onOpen: (node: FileNode) => void }) {
  const { activeTabId, tabs } = useEditorStore()
  const isActive = tabs.find(t => t.id === activeTabId)?.filePath === node.path

  return (
    <div>
      <div
        onClick={() => onOpen(node)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: `2px 12px 2px ${12 + depth * 12}px`,
          cursor: 'pointer',
          background: isActive ? 'var(--bg-active)' : 'transparent',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: 13,
          borderRadius: 0,
          userSelect: 'none',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
      >
        {node.type === 'directory' ? (
          <>
            {node.isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {node.isOpen ? <FolderOpen size={14} style={{ color: '#e3c23a', flexShrink: 0 }} /> : <Folder size={14} style={{ color: '#e3c23a', flexShrink: 0 }} />}
          </>
        ) : (
          <>
            <span style={{ width: 12, flexShrink: 0 }} />
            <FileIcon name={node.name} />
          </>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
      </div>
      {node.type === 'directory' && node.isOpen && node.children && (
        <FileTree nodes={node.children} depth={depth + 1} onOpen={onOpen} />
      )}
    </div>
  )
}

function FileIcon({ name }: { name: string }) {
  const ext = extname(name).toLowerCase()
  const color = fileIconColor(ext)
  return <File size={14} style={{ color, flexShrink: 0 }} />
}

function fileIconColor(ext: string): string {
  const colors: Record<string, string> = {
    '.ts': '#3b82f6', '.tsx': '#3b82f6',
    '.js': '#f59e0b', '.jsx': '#f59e0b',
    '.py': '#22c55e',
    '.html': '#f97316',
    '.css': '#a855f7', '.scss': '#ec4899',
    '.json': '#f59e0b',
    '.md': '#6b7280',
    '.sql': '#06b6d4',
    '.env': '#84cc16',
    '.gitignore': '#6b7280',
    '.sh': '#10b981',
    '.rs': '#ef4444',
    '.go': '#06b6d4',
  }
  return colors[ext] || '#8b949e'
}

function EmptyState({ onOpen }: { onOpen: () => void }) {
  return (
    <div style={{ padding: '24px 16px', textAlign: 'center' }}>
      <FolderOpen size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
        No folder opened
      </p>
    </div>
  )
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--text-muted)',
        padding: '3px',
        borderRadius: 3,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = 'var(--text-primary)'
        e.currentTarget.style.background = 'var(--bg-hover)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = 'var(--text-muted)'
        e.currentTarget.style.background = 'none'
      }}
    >
      {children}
    </button>
  )
}

