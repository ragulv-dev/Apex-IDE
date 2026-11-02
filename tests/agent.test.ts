import { describe, it, expect } from 'vitest'
import { AGENT_TOOLS_SCHEMA, AgentEngine } from '../src/engine/agent'

describe('Agent Engine & Tool Schema', () => {
  it('defines all required coding tools with strict JSON schema', () => {
    const toolNames = AGENT_TOOLS_SCHEMA.map(t => t.function.name)
    expect(toolNames).toContain('read_file')
    expect(toolNames).toContain('write_file')
    expect(toolNames).toContain('search_code')
    expect(toolNames).toContain('list_files')
    expect(toolNames).toContain('run_command')
    expect(toolNames).toContain('delete_file')
  })

  it('generates appropriate system prompts for ask, plan, and agent modes', () => {
    const engine = new AgentEngine()

    const askPrompt = engine.getSystemPrompt('ask', '/workspace')
    expect(askPrompt).toContain('MODE: ASK')
    expect(askPrompt).toContain('Do not attempt direct file modifications')

    const planPrompt = engine.getSystemPrompt('plan', '/workspace')
    expect(planPrompt).toContain('MODE: PLAN')
    expect(planPrompt).toContain('Do NOT execute changes until the user approves the plan')

    const agentPrompt = engine.getSystemPrompt('agent', '/workspace')
    expect(agentPrompt).toContain('MODE: AGENT')
    expect(agentPrompt).toContain('Autonomous Coding')
  })
})
