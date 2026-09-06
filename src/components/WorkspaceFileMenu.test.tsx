// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WorkspaceFileMenu } from './WorkspaceFileMenu'
import { ModalSurface } from './ui/ModalSurface'

afterEach(cleanup)

function openMenu(kind: 'file' | 'directory' = 'file') {
  const onAction = vi.fn()
  const result = render(<div style={{ overflow: 'auto', height: 30 }}>
    <WorkspaceFileMenu label="测试笔记" path="notes/test.md" kind={kind} noteId="test" onAction={onAction} />
  </div>)
  const trigger = screen.getByRole('button')
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  return { ...result, trigger, onAction }
}

describe('workspace file menu', () => {
  it('escapes the scrolling container and restores focus on Escape', async () => {
    const { container, trigger, onAction } = openMenu()
    const menu = await screen.findByRole('menu')
    expect(container.contains(menu)).toBe(false)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '重命名' })))
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
    expect(onAction).not.toHaveBeenCalled()
  })

  it('supports arrow selection and passes the exact file request once', async () => {
    const { onAction } = openMenu()
    const rename = await screen.findByRole('menuitem', { name: '重命名' })
    await waitFor(() => expect(document.activeElement).toBe(rename))
    fireEvent.keyDown(rename, { key: 'ArrowDown' })
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '移动' })))
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' })
    await waitFor(() => expect(onAction).toHaveBeenCalledExactlyOnceWith({ action: 'move', path: 'notes/test.md', kind: 'file', noteId: 'test' }))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('does not expose document duplication for a directory', async () => {
    openMenu('directory')
    await screen.findByRole('menu')
    expect(screen.queryByRole('menuitem', { name: '创建副本' })).toBeNull()
  })

  it('hands focus to a dialog and restores the original file button when it closes', async () => {
    function Harness() {
      const [open, setOpen] = useState(false)
      return <><WorkspaceFileMenu label="测试" path="notes/test.md" kind="file" onAction={() => setOpen(true)} />
        <ModalSurface open={open} onOpenChange={setOpen} title="Rename" layerClassName="" className="">
          <input aria-label="Name" />
        </ModalSurface></>
    }
    render(<Harness />)
    const trigger = screen.getByRole('button')
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: '重命名' }))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox')))
    expect(screen.queryByRole('menu')).toBeNull()
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
