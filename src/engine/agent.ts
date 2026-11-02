import { AgentMode, Message, ToolCall } from '../types'
import { nanoid } from '../utils/nanoid'

export interface AgentStep {
  id: string
  type: 'thought' | 'tool_call' | 'approval_required' | 'tool_result' | 'file_change' | 'complete' | 'error'
  content: string
  toolCall?: ToolCall
  requiresApproval?: boolean
}

export const AGENT_TOOLS_SCHEMA = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Reads the complete text content of a workspace file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path of the file from workspace root' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Writes or updates full content to a file in the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path of the file to write' },
          content: { type: 'string', description: 'Full new file content' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_code',
      description: 'Searches workspace files for code matching a text keyword or symbol.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text or symbol name to search for' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'Lists files and folders inside a directory in the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative directory path (empty string for workspace root)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Executes a shell command in the project terminal. Always requires user authorization.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command to execute' },
          cwd: { type: 'string', description: 'Working directory relative to project root' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Deletes a file from the workspace. Always requires explicit user confirmation.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path of the file to delete' },
        },
        required: ['path'],
      },
    },
  },
]

export class AgentEngine {
  private abortController: AbortController | null = null

  public abort() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  public async executeTool(
    toolName: string,
    args: Record<string, any>,
    workspacePath: string,
    onApprovalRequest?: (prompt: string) => Promise<boolean>
  ): Promise<any> {
    // Safety check: run_command
    if (toolName === 'run_command') {
      if (onApprovalRequest) {
        const approved = await onApprovalRequest(`Run terminal command: "${args.command}"?`)
        if (!approved) return { error: 'Command execution cancelled by user.' }
      }
    }

    // Safety check: delete_file
    if (toolName === 'delete_file') {
      if (onApprovalRequest) {
        const approved = await onApprovalRequest(`Delete file: "${args.path}"?`)
        if (!approved) return { error: 'File deletion cancelled by user.' }
      }
      return window.electron.fs.deleteFile(`${workspacePath}/${args.path}`)
    }

    // Execute via main process IPC
    return (window.electron as any).agent.executeTool?.({
      name: toolName,
      args,
      workspacePath,
    }) || this.executeToolFallback(toolName, args, workspacePath)
  }

  private async executeToolFallback(toolName: string, args: Record<string, any>, workspacePath: string): Promise<any> {
    switch (toolName) {
      case 'read_file': {
        const fullPath = `${workspacePath}/${args.path}`.replace(/\/+/g, '/')
        const res = await window.electron.fs.readFile(fullPath)
        return res.ok ? { content: res.content } : { error: res.error }
      }
      case 'write_file': {
        const fullPath = `${workspacePath}/${args.path}`.replace(/\/+/g, '/')
        const res = await window.electron.fs.writeFile(fullPath, args.content)
        return res.ok ? { success: true } : { error: res.error }
      }
      case 'search_code': {
        const res = await window.electron.indexer.search(args.query, 15)
        return res.ok ? { matches: res.results } : { error: 'Search failed' }
      }
      case 'list_files': {
        const fullPath = args.path ? `${workspacePath}/${args.path}` : workspacePath
        const res = await window.electron.fs.readDir(fullPath)
        return res.ok ? { files: res.entries } : { error: res.error }
      }
      default:
        return { error: `Unknown tool: ${toolName}` }
    }
  }

  public getSystemPrompt(mode: AgentMode, workspacePath: string | null): string {
    const base = `You are Apex IDE's world-class AI coding agent.
Workspace: ${workspacePath ? workspacePath : 'No workspace open'}`

    if (mode === 'ask') {
      return `${base}
MODE: ASK
Focus on answering questions, explaining code, architecting solutions, and suggesting patterns. Do not attempt direct file modifications unless specifically requested.`
    }

    if (mode === 'plan') {
      return `${base}
MODE: PLAN
When presented with a feature or bug:
1. Inspect the codebase and architecture.
2. Outline a detailed, phased implementation plan.
3. List the exact files that will be created or modified.
4. Highlight technical risks, dependency requirements, and edge cases.
Do NOT execute changes until the user approves the plan.`
    }

    // Agent mode
    return `${base}
MODE: AGENT (Autonomous Coding)
You have full tool-calling capabilities to read, search, create, and modify files.
When implementing a task:
1. Examine existing files first to understand conventions and imports.
2. Formulate your steps.
3. Call tools to inspect code, write changes, or test.
4. Verify changes and report completion clearly.
Always preserve existing docstrings, comments, and style.`
  }
}

export const agentEngine = new AgentEngine()
