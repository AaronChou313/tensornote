// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LabInsertDialog } from './LabInsertDialog'
import { parseSidecarDirectives } from '../sidecar/parser'

describe('Sidecar insert dialog', () => {
  afterEach(cleanup)
  it('creates a multi-cell Jupyter directive', () => {
    const onInsert = vi.fn()
    render(<LabInsertDialog initialCode="value = 3" onInsert={onInsert} onClose={() => undefined} />)
    fireEvent.change(screen.getByLabelText('Sidecar 标识'), { target: { value: 'demo' } })
    fireEvent.click(screen.getByRole('button', { name: '添加 Cell' }))
    fireEvent.click(screen.getByRole('button', { name: '插入' }))
    expect(onInsert.mock.calls[0][0]).toContain('type="jupyter" id="demo"')
    expect(onInsert.mock.calls[0][0].match(/```python/g)).toHaveLength(2)
  })

  it('creates a derivation directive', () => {
    const onInsert = vi.fn()
    render(<LabInsertDialog initialCode="x = y" onInsert={onInsert} onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /推导 \/ 补充/ }))
    fireEvent.click(screen.getByRole('button', { name: '插入' }))
    expect(onInsert.mock.calls[0][0]).toContain('type="derivation"')
    expect(onInsert.mock.calls[0][0]).toContain('x = y')
  })

  it('generates a unique ID from the title without requiring ID input', () => {
    const onInsert = vi.fn()
    render(<LabInsertDialog existingIds={['python-experiment']} onInsert={onInsert} onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: '插入' }))
    expect(onInsert.mock.calls[0][0]).toContain('id="python-experiment-2"')
  })

  it('edits and confirms deletion of an existing Sidecar', () => {
    const existing = parseSidecarDirectives(':::tensornote{type="derivation" id="proof" title="Proof"}\nDetails\n:::').sidecars[0]
    const onSave = vi.fn()
    const onDelete = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<LabInsertDialog existing={existing} onSave={onSave} onDelete={onDelete} onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }))
    expect(onSave.mock.calls[0][0]).toContain('id="proof"')
    fireEvent.click(screen.getByRole('button', { name: '删除侧栏内容' }))
    expect(onDelete).toHaveBeenCalledOnce()
  })
})
