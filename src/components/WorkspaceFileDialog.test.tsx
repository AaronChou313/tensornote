// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorkspaceFileDialog } from './WorkspaceFileDialog'
import { useAppStore } from '../store/useAppStore'

const workspace = vi.hoisted(() => ({
  session: { manifest: { content: { root: 'notes' } }, capabilities: { write: true }, documentById: new Map() },
  provider: {}, createFolder: vi.fn(),
}))
vi.mock('../store/useWorkspaceStore', () => ({ useWorkspaceStore: (selector: (state: typeof workspace) => unknown) => selector(workspace) }))
beforeEach(() => {
  workspace.createFolder.mockReset()
  workspace.session.capabilities.write = true
  useAppStore.setState({ editorDirtyPaths: {}, labDirty: false })
})
afterEach(cleanup)

function setup() {
  const close = vi.fn()
  render(<MemoryRouter><WorkspaceFileDialog request={{ action: 'new-folder' }} onClose={close} /></MemoryRouter>)
  return { close, input: screen.getByRole('textbox') }
}

describe('file operation dialog', () => {
  it('ignores composition Enter and prevents duplicate submission and dismissal while writing', async () => {
    let finish!: () => void
    workspace.createFolder.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve }))
    const { input, close } = setup()
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(workspace.createFolder).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(workspace.createFolder).toHaveBeenCalledExactlyOnceWith('notes/new-folder')
    expect(close).not.toHaveBeenCalled()
    finish()
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
  })

  it('keeps input on failure and allows retry', async () => {
    workspace.createFolder.mockRejectedValueOnce(new Error('无法创建文件夹')).mockResolvedValueOnce(undefined)
    const { input, close } = setup()
    fireEvent.change(input, { target: { value: 'notes/my-folder' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect((await screen.findByRole('alert')).textContent).toBe('无法创建文件夹')
    expect((input as HTMLInputElement).value).toBe('notes/my-folder')
    expect(close).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
    expect(workspace.createFolder).toHaveBeenCalledTimes(2)
  })

  it('rejects a request if the workspace has become read-only', async () => {
    workspace.session.capabilities.write = false
    const { input } = setup()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect((await screen.findByRole('alert')).textContent).toContain('只读')
    expect(workspace.createFolder).not.toHaveBeenCalled()
  })
})
