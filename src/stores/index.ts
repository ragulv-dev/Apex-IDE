import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AppSettings,
  ProviderConfig,
  Conversation,
  Message,
  EditorTab,
  FileNode,
  AgentMode,
} from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { nanoid } from '../utils/nanoid'

// ─── Settings Store ────────────────────────────────────────────────────────────
interface SettingsState extends AppSettings {
  setTheme: (theme: 'dark' | 'light') => void
  setFontSize: (size: number) => void
  setTabSize: (size: number) => void
  setWordWrap: (wrap: boolean) => void
  setMinimap: (show: boolean) => void
  setAutocomplete: (enabled: boolean) => void
  setTemperature: (t: number) => void
  setMaxOutputTokens: (n: number) => void
  setDefaultModel: (providerId: string | null, modelId: string | null) => void
  setAutocompleteModel: (providerId: string | null, modelId: string | null) => void
  setAgentMode: (mode: AgentMode) => void
  setProviders: (providers: ProviderConfig[]) => void
  addProvider: (provider: ProviderConfig) => void
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => void
  removeProvider: (id: string) => void
  update: (updates: Partial<AppSettings>) => void
  reset: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setTabSize: (tabSize) => set({ tabSize }),
      setWordWrap: (wordWrap) => set({ wordWrap }),
      setMinimap: (minimap) => set({ minimap }),
      setAutocomplete: (autocomplete) => set({ autocomplete }),
      setTemperature: (temperature) => set({ temperature }),
      setMaxOutputTokens: (maxOutputTokens) => set({ maxOutputTokens }),
      setDefaultModel: (defaultProviderId, defaultModelId) =>
        set({ defaultProviderId, defaultModelId }),
      setAutocompleteModel: (autocompleteProviderId, autocompleteModelId) =>
        set({ autocompleteProviderId, autocompleteModelId }),
      setAgentMode: (agentMode) => set({ agentMode }),
      setProviders: (providers) => set({ providers }),
      addProvider: (provider) =>
        set(state => ({ providers: [...state.providers, provider] })),
      updateProvider: (id, updates) =>
        set(state => ({
          providers: state.providers.map(p =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        })),
      removeProvider: (id) =>
        set(state => ({ providers: state.providers.filter(p => p.id !== id) })),
      update: (updates) => set(updates),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'apex-ide-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// ─── Workspace Store ───────────────────────────────────────────────────────────
interface WorkspaceState {
  workspacePath: string | null
  fileTree: FileNode[]
  setWorkspacePath: (path: string | null) => void
  setFileTree: (tree: FileNode[]) => void
  toggleFolder: (path: string) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspacePath: null,
      fileTree: [],
      setWorkspacePath: (workspacePath) => set({ workspacePath, fileTree: [] }),
      setFileTree: (fileTree) => set({ fileTree }),
      toggleFolder: (path) =>
        set(state => ({
          fileTree: toggleFolderInTree(state.fileTree, path),
        })),
    }),
    {
      name: 'apex-ide-workspace',
      partialize: (state) => ({ workspacePath: state.workspacePath }),
    }
  )
)

function toggleFolderInTree(nodes: FileNode[], path: string): FileNode[] {
  return nodes.map(node => {
    if (node.path === path) return { ...node, isOpen: !node.isOpen }
    if (node.children) return { ...node, children: toggleFolderInTree(node.children, path) }
    return node
  })
}

// ─── Editor Store ─────────────────────────────────────────────────────────────
interface EditorState {
  tabs: EditorTab[]
  activeTabId: string | null
  openFile: (file: EditorTab) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabContent: (id: string, content: string) => void
  markTabDirty: (id: string, dirty: boolean) => void
  saveTab: (id: string) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openFile: (file) => {
    const { tabs } = get()
    const existing = tabs.find(t => t.filePath === file.filePath)
    if (existing) {
      set({ activeTabId: existing.id })
    } else {
      set({ tabs: [...tabs, file], activeTabId: file.id })
    }
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get()
    const idx = tabs.findIndex(t => t.id === id)
    const newTabs = tabs.filter(t => t.id !== id)
    let newActive = activeTabId
    if (activeTabId === id) {
      if (newTabs.length === 0) newActive = null
      else if (idx > 0) newActive = newTabs[idx - 1].id
      else newActive = newTabs[0].id
    }
    set({ tabs: newTabs, activeTabId: newActive })
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabContent: (id, content) =>
    set(state => ({
      tabs: state.tabs.map(t =>
        t.id === id ? { ...t, content, isDirty: content !== t.originalContent } : t
      ),
    })),

  markTabDirty: (id, dirty) =>
    set(state => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, isDirty: dirty } : t),
    })),

  saveTab: (id) =>
    set(state => ({
      tabs: state.tabs.map(t =>
        t.id === id ? { ...t, isDirty: false, originalContent: t.content } : t
      ),
    })),
}))

// ─── Chat Store ───────────────────────────────────────────────────────────────
interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  isStreaming: boolean
  streamingContent: string
  createConversation: (providerId?: string | null, modelId?: string | null) => string
  deleteConversation: (id: string) => void
  setActiveConversation: (id: string) => void
  addMessage: (conversationId: string, message: Message) => void
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void
  appendStreamChunk: (chunk: string) => void
  setStreaming: (streaming: boolean) => void
  finalizeStream: (conversationId: string, messageId: string) => void
  clearStreamBuffer: () => void
  updateConversationModel: (id: string, providerId: string, modelId: string) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      isStreaming: false,
      streamingContent: '',

      createConversation: (providerId = null, modelId = null) => {
        const id = nanoid()
        const conversation: Conversation = {
          id,
          title: 'New Chat',
          messages: [],
          providerId,
          modelId,
          workspacePath: useWorkspaceStore.getState().workspacePath,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set(state => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
        }))
        return id
      },

      deleteConversation: (id) =>
        set(state => {
          const remaining = state.conversations.filter(c => c.id !== id)
          return {
            conversations: remaining,
            activeConversationId:
              state.activeConversationId === id
                ? remaining[0]?.id ?? null
                : state.activeConversationId,
          }
        }),

      setActiveConversation: (id) => set({ activeConversationId: id }),

      addMessage: (conversationId, message) =>
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [...c.messages, message],
                  updatedAt: Date.now(),
                  title: c.messages.length === 0 && message.role === 'user'
                    ? message.content.slice(0, 60)
                    : c.title,
                }
              : c
          ),
        })),

      updateMessage: (conversationId, messageId, updates) =>
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map(m =>
                    m.id === messageId ? { ...m, ...updates } : m
                  ),
                }
              : c
          ),
        })),

      appendStreamChunk: (chunk) =>
        set(state => ({ streamingContent: state.streamingContent + chunk })),

      setStreaming: (isStreaming) => set({ isStreaming }),

      finalizeStream: (conversationId, messageId) => {
        const { streamingContent } = get()
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map(m =>
                    m.id === messageId ? { ...m, content: streamingContent } : m
                  ),
                }
              : c
          ),
          streamingContent: '',
          isStreaming: false,
        }))
      },

      clearStreamBuffer: () => set({ streamingContent: '', isStreaming: false }),

      updateConversationModel: (id, providerId, modelId) =>
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === id ? { ...c, providerId, modelId } : c
          ),
        })),
    }),
    {
      name: 'apex-ide-chat',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversations: state.conversations.map(c => ({
          ...c,
          messages: c.messages.slice(-100), // Keep last 100 messages per conversation
        })),
        activeConversationId: state.activeConversationId,
      }),
    }
  )
)

// ─── UI Store ─────────────────────────────────────────────────────────────────
interface UIState {
  sidebarWidth: number
  chatPanelWidth: number
  terminalHeight: number
  showChat: boolean
  showSidebar: boolean
  showTerminal: boolean
  showSettings: boolean
  showGitPanel: boolean
  activePanel: 'explorer' | 'search' | 'git' | 'extensions'
  commandPaletteOpen: boolean
  setSidebarWidth: (w: number) => void
  setChatPanelWidth: (w: number) => void
  setTerminalHeight: (h: number) => void
  toggleChat: () => void
  toggleSidebar: () => void
  toggleTerminal: () => void
  toggleSettings: () => void
  setActivePanel: (panel: 'explorer' | 'search' | 'git' | 'extensions') => void
  setCommandPaletteOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarWidth: 240,
      chatPanelWidth: 380,
      terminalHeight: 220,
      showChat: true,
      showSidebar: true,
      showTerminal: false,
      showSettings: false,
      showGitPanel: false,
      activePanel: 'explorer',
      commandPaletteOpen: false,

      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      setChatPanelWidth: (chatPanelWidth) => set({ chatPanelWidth }),
      setTerminalHeight: (terminalHeight) => set({ terminalHeight }),
      toggleChat: () => set(s => ({ showChat: !s.showChat })),
      toggleSidebar: () => set(s => ({ showSidebar: !s.showSidebar })),
      toggleTerminal: () => set(s => ({ showTerminal: !s.showTerminal })),
      toggleSettings: () => set(s => ({ showSettings: !s.showSettings })),
      setActivePanel: (activePanel) => set({ activePanel }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
    }),
    {
      name: 'apex-ide-ui',
      partialize: (state) => ({
        sidebarWidth: state.sidebarWidth,
        chatPanelWidth: state.chatPanelWidth,
        terminalHeight: state.terminalHeight,
        showChat: state.showChat,
        showSidebar: state.showSidebar,
        activePanel: state.activePanel,
      }),
    }
  )
)

