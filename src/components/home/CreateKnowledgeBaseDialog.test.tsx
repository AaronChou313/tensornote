// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebHostAdapter } from '../../host/WebHostAdapter'
import { installHostAdapter } from '../../host/runtime'
import type { WorkspaceProvider } from '../../workspace/types'
import { CreateKnowledgeBaseDialog } from './CreateKnowledgeBaseDialog'

const { pickLocalWorkspaceParent, createLocalWorkspaceInParent } = vi.hoisted(() => ({
  pickLocalWorkspaceParent: vi.fn(),
  createLocalWorkspaceInParent: vi.fn(),
}))
vi.mock('../../workspace/providers/LocalWorkspaceProvider', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../workspace/providers/LocalWorkspaceProvider')>(),
  pickLocalWorkspaceParent,
  createLocalWorkspaceInParent,
}))

const provider = {} as WorkspaceProvider

describe('CreateKnowledgeBaseDialog', () => {
  beforeEach(() => {
    installHostAdapter(new WebHostAdapter('Web'))
    pickLocalWorkspaceParent.mockReset()
    createLocalWorkspaceInParent.mockReset()
  })
  afterEach(cleanup)

  it('previews the child path, initializes the selected parent and opens the result', async () => {
    const parent = { kind: 'directory', name: 'Knowledge' }
    pickLocalWorkspaceParent.mockResolvedValue(parent)
    createLocalWorkspaceInParent.mockResolvedValue(provider)
    const onCreate = vi.fn().mockResolvedValue(undefined)
    render(<CreateKnowledgeBaseDialog open onOpenChange={() => undefined} onCreate={onCreate} busy={false} />)

    fireEvent.change(screen.getByLabelText('知识库名称'), { target: { value: '课程笔记' } })
    fireEvent.click(screen.getByRole('button', { name: '选择…' }))
    await screen.findByTitle('Knowledge / 课程笔记')
    fireEvent.click(screen.getByRole('button', { name: '创建知识库' }))

    await waitFor(() => expect(createLocalWorkspaceInParent).toHaveBeenCalledWith(parent, '课程笔记', expect.stringContaining('name: "课程笔记"')))
    expect(onCreate).toHaveBeenCalledWith(provider)
  })

  it('keeps picker cancellation local and validates unsafe names before creation', async () => {
    pickLocalWorkspaceParent.mockRejectedValue(new DOMException('cancelled', 'AbortError'))
    render(<CreateKnowledgeBaseDialog open onOpenChange={() => undefined} onCreate={vi.fn()} busy={false} />)
    fireEvent.click(screen.getByRole('button', { name: '选择…' }))
    await waitFor(() => expect(pickLocalWorkspaceParent).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.change(screen.getByLabelText('知识库名称'), { target: { value: 'bad/name' } })
    expect(screen.getByText('知识库名称包含系统不允许的字符')).toBeTruthy()
    expect(createLocalWorkspaceInParent).not.toHaveBeenCalled()
  })
})
