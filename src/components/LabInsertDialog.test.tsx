// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LabInsertDialog } from './LabInsertDialog'

describe('LabInsertDialog', () => {
  it('turns selected code and additional cells into one executable lab', () => {
    const onInsert = vi.fn()
    render(<LabInsertDialog initialCode="value = 3" onInsert={onInsert} onClose={() => undefined} />)

    fireEvent.change(screen.getByLabelText('实验标识'), { target: { value: 'demo-lab' } })
    fireEvent.click(screen.getByRole('button', { name: '添加 Cell' }))
    fireEvent.click(screen.getByRole('button', { name: '插入实验' }))

    expect(onInsert).toHaveBeenCalledOnce()
    expect(onInsert.mock.calls[0][0]).toContain('lab="demo-lab" cell="1"')
    expect(onInsert.mock.calls[0][0]).toContain('value = 3')
    expect(onInsert.mock.calls[0][0]).toContain('lab="demo-lab" cell="2"')
  })
})
