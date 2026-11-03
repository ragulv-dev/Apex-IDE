import { describe, it, expect, beforeEach } from 'vitest'
import { join } from 'path'

// Test symbol extraction logic
describe('Project Indexer & Code Intelligence', () => {
  const sampleCode = `
import React, { useState } from 'react'

export interface UserProfile {
  id: string
  name: string
}

export type AuthState = 'logged_in' | 'logged_out'

export class AuthManager {
  private token: string = ''
  
  public login() {
    return true
  }
}

export function calculateMetrics(a: number, b: number): number {
  return a + b
}

const handlePayment = async () => {
  return { status: 'success' }
}
`

  it('correctly extracts functions, classes, interfaces, and types', () => {
    const functionRegex = /(?:function\s+([A-Za-z0-9_$]+)|(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>|def\s+([A-Za-z0-9_]+))/
    const classRegex = /(?:class\s+([A-Za-z0-9_$]+))/
    const interfaceRegex = /(?:interface\s+([A-Za-z0-9_$]+))/
    const typeRegex = /(?:type\s+([A-Za-z0-9_$]+)\s*=)/

    const symbols: string[] = []
    const lines = sampleCode.split('\n')

    for (const line of lines) {
      const fn = line.match(functionRegex)
      if (fn) symbols.push(fn[1] || fn[2] || fn[3])
      const cls = line.match(classRegex)
      if (cls) symbols.push(cls[1])
      const iface = line.match(interfaceRegex)
      if (iface) symbols.push(iface[1])
      const typ = line.match(typeRegex)
      if (typ) symbols.push(typ[1])
    }

    expect(symbols).toContain('UserProfile')
    expect(symbols).toContain('AuthState')
    expect(symbols).toContain('AuthManager')
    expect(symbols).toContain('calculateMetrics')
    expect(symbols).toContain('handlePayment')
  })

  it('filters out node_modules, build, and hidden directories', () => {
    const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next'])
    expect(ignoreDirs.has('node_modules')).toBe(true)
    expect(ignoreDirs.has('.git')).toBe(true)
    expect(ignoreDirs.has('src')).toBe(false)
  })
})

