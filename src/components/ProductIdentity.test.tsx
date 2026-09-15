// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WebHostAdapter } from '../host/WebHostAdapter'
import { installHostAdapter } from '../host/runtime'
import type { HostAdapter } from '../host/types'
import { USER_GUIDE_URL } from '../config/links'
import { ProductIdentity } from './ProductIdentity'

const openUrl = vi.fn()
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl }))

afterEach(() => {
  cleanup()
  installHostAdapter(new WebHostAdapter('Web'))
  vi.clearAllMocks()
})

describe('ProductIdentity', () => {
  it('groups the product, Web host badge and centralized guide link', () => {
    render(<ProductIdentity />)
    expect(screen.getByText('TensorNote')).toBeTruthy()
    expect(screen.getByText('Web版')).toBeTruthy()
    expect(screen.getByRole('link', { name: /使用说明/ }).getAttribute('href')).toBe(USER_GUIDE_URL)
  })

  it('opens the guide through the Desktop safe external-link plugin', async () => {
    const desktop = new WebHostAdapter('Desktop') as unknown as HostAdapter
    Object.defineProperty(desktop, 'id', { value: 'desktop' })
    installHostAdapter(desktop)
    render(<ProductIdentity />)
    fireEvent.click(screen.getByRole('link', { name: /使用说明/ }))
    await vi.waitFor(() => expect(openUrl).toHaveBeenCalledWith(USER_GUIDE_URL))
    expect(screen.getByText('桌面版')).toBeTruthy()
  })
})
