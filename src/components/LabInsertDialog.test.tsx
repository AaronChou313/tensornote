// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LabInsertDialog } from './LabInsertDialog'

describe('Sidecar insert dialog', () => {
  afterEach(cleanup)
  it('creates a multi-cell Jupyter directive', () => {
    const onInsert = vi.fn()
    render(<LabInsertDialog initialCode="value = 3" onInsert={onInsert} onClose={() => undefined} />)
    fireEvent.change(screen.getByLabelText('Sidecar 标识'), { target: { value: 'demo' } })
    fireEvent.click(screen.getByRole('button', { name: '添加 Cell' }))
    fireEvent.click(screen.getByRole('button', { name: '插入 Sidecar' }))
    expect(onInsert.mock.calls[0][0]).toContain('type="jupyter" id="demo"')
    expect(onInsert.mock.calls[0][0].match(/```python/g)).toHaveLength(2)
  })

  it('creates a derivation directive', () => {
    const onInsert = vi.fn()
    render(<LabInsertDialog initialCode="x = y" onInsert={onInsert} onClose={() => undefined} />)
    fireEvent.change(screen.getByLabelText('Sidecar 类型'), { target: { value: 'derivation' } })
    fireEvent.click(screen.getByRole('button', { name: '插入 Sidecar' }))
    expect(onInsert.mock.calls[0][0]).toContain('type="derivation"')
    expect(onInsert.mock.calls[0][0]).toContain('x = y')
  })
})
