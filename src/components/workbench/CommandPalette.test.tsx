// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CommandPalette } from './CommandPalette'
import { CommandRegistry } from '../../commands/CommandRegistry'
import { CommandRegistryContext } from '../../commands/CommandContext'
import { useAppStore } from '../../store/useAppStore'

beforeEach(() => useAppStore.setState({ commandPaletteOpen: false }))
afterEach(cleanup)

function setup() {
  const registry = new CommandRegistry()
  const first = vi.fn()
  const second = vi.fn()
  registry.register({ id: 'first', label: 'First note', category: 'Navigation', execute: first })
  registry.register({ id: 'second', label: 'Second note', category: 'Navigation', execute: second })
  render(<CommandRegistryContext.Provider value={registry}>
    <button onClick={() => useAppStore.getState().setCommandPaletteOpen(true)}>Open commands</button>
    <CommandPalette />
  </CommandRegistryContext.Provider>)
  const trigger = screen.getByText('Open commands')
  trigger.focus()
  fireEvent.click(trigger)
  return { first, second, trigger }
}

describe('command palette interaction', () => {
  it('toggles once with the shortcut and respects another open dialog', async () => {
    setup()
    fireEvent.keyDown(window, { key: 'p', ctrlKey: true })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const other = document.createElement('section')
    other.setAttribute('role', 'dialog')
    document.body.append(other)
    try {
      fireEvent.keyDown(window, { key: 'p', ctrlKey: true })
      expect(screen.queryByRole('combobox')).toBeNull()
    } finally { other.remove() }
    fireEvent.keyDown(window, { key: 'p', ctrlKey: true })
    expect(screen.getByRole('combobox')).toBeTruthy()
  })

  it('keeps reverse Tab inside the dialog and restores focus after Escape', async () => {
    const { trigger } = setup()
    const input = screen.getByRole('combobox')
    expect(document.activeElement).toBe(input)
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByLabelText('关闭命令面板'))
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('selects with arrows and executes only the selected command after closing', async () => {
    const { first, second } = setup()
    const input = screen.getByRole('combobox')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getByRole('option', { name: /Second note/ }).getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(second).toHaveBeenCalledOnce())
    expect(first).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does not execute during IME composition or when the query has no results', async () => {
    const { first, second, trigger } = setup()
    const input = screen.getByRole('combobox')
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    fireEvent.change(input, { target: { value: 'unmatched' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toContain('没有匹配')
    fireEvent.click(screen.getByLabelText('关闭命令面板'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(trigger)
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('')
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })
})
