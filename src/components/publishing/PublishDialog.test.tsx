// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { useWorkbenchStore } from '../../workbench/useWorkbenchStore'
import type { WorkspaceSession, WorkspaceSourceType } from '../../workspace/types'
import { PublishDialog } from './PublishDialog'

function session(type: WorkspaceSourceType): WorkspaceSession {
  const note = { id: 'intro', path: 'notes/intro.md', frontmatter: { title: '开始阅读' } }
  return {
    descriptor: {
      id: `${type}:demo`, type, name: 'Demo', sourceLabel: String(type), detail: 'owner/demo · main', revision: 'a'.repeat(40),
      config: type === 'local' ? { provider: 'local' } : { provider: String(type), project: 'owner/demo', repositoryUrl: `https://${type}.com/owner/demo`, ref: 'main' },
    },
    manifest: { schemaVersion: 1, workspace: { name: 'Demo' }, content: { root: 'notes' }, assets: { root: 'assets' }, navigation: { mode: 'filesystem' }, features: { executable: false }, environment: { files: [] }, publishing: {}, extensions: {} },
    compatibility: { sourceVersion: 1, targetVersion: 1, status: 'supported', readOnly: false, warnings: [] },
    capabilities: { read: true, write: type === 'local', watch: false, binary: true, git: false, authentication: false },
    documents: [note as never], documentById: new Map([['intro', note as never]]), knowledgeIndex: {} as never, environmentFiles: [], navigation: [], trusted: false, openedAt: 1,
  }
}

describe('PublishDialog', () => {
  beforeEach(() => {
    useAppStore.setState({ publishOpen: true })
    useWorkbenchStore.setState({ activeNoteId: 'intro' })
  })
  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  it('explains how to share a local knowledge base without inventing an upload flow', () => {
    useWorkspaceStore.setState({ session: session('local') })
    render(<MemoryRouter initialEntries={['/workspace']}><PublishDialog /></MemoryRouter>)
    expect(screen.getByText('这是一个本地知识库。')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '复制链接' })).toBeNull()
  })

  it('shares the current remote note and only pins the revision on request', async () => {
    useWorkspaceStore.setState({ session: session('gitee') })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
    render(<MemoryRouter initialEntries={['/notes/intro']}><PublishDialog /></MemoryRouter>)
    const input = screen.getByLabelText('分享链接') as HTMLInputElement
    expect(input.value).toContain('provider=gitee')
    expect(input.value).toContain('note=intro')
    expect(input.value).not.toContain('revision=')
    expect(screen.getByText('开始阅读')).toBeTruthy()
    fireEvent.click(screen.getByText('更多选项'))
    fireEvent.click(screen.getByRole('checkbox', { name: /固定到当前版本/ }))
    expect(input.value).toContain(`revision=${'a'.repeat(40)}`)
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(input.value))
  })
})
