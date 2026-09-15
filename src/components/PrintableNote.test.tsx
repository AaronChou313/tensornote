// @vitest-environment jsdom
import { StrictMode } from 'react'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseDocument } from '../content/document'
import { usePrintStore } from '../printing/usePrintStore'
import type { WorkspaceProvider } from '../workspace/types'
import { PrintableNote } from './PrintableNote'

const provider = {
  resolveAssetUrl: vi.fn(async (path: string) => path),
} as unknown as WorkspaceProvider

afterEach(() => {
  usePrintStore.setState({ request: null, nextRequestId: 1 })
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PrintableNote', () => {
  it('prints each request once under StrictMode and supports repeated exports', async () => {
    const note = parseDocument('notes/export.md', '---\nid: export\ntitle: 可打印笔记\n---\n正文')
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
    render(<StrictMode><PrintableNote note={note} provider={provider} /></StrictMode>)

    act(() => usePrintStore.getState().requestNotePrint(note.id))
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    expect(usePrintStore.getState().request).toBeNull()

    act(() => usePrintStore.getState().requestNotePrint(note.id))
    await waitFor(() => expect(print).toHaveBeenCalledTimes(2))
    expect(usePrintStore.getState().request).toBeNull()
  })

  it('waits for workspace images to resolve before printing', async () => {
    const note = parseDocument('notes/image-export.md', '---\nid: image-export\ntitle: 图片笔记\n---\n![示例](./image.png)')
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    let imageLoaded = false
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockImplementation(() => imageLoaded)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
    let resolveAsset: ((url: string) => void) | undefined
    const imageProvider = {
      resolveAssetUrl: vi.fn(() => new Promise<string>((resolve) => { resolveAsset = resolve })),
    } as unknown as WorkspaceProvider
    render(<PrintableNote note={note} provider={imageProvider} />)

    act(() => usePrintStore.getState().requestNotePrint(note.id))
    expect(print).not.toHaveBeenCalled()
    await waitFor(() => expect(resolveAsset).toBeTypeOf('function'))
    await act(async () => resolveAsset?.('blob:print-image'))
    const image = await waitFor(() => {
      const element = document.querySelector<HTMLImageElement>('img[alt="示例"]')
      expect(element).not.toBeNull()
      return element as HTMLImageElement
    })
    expect(print).not.toHaveBeenCalled()
    imageLoaded = true
    fireEvent.load(image)

    await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
  })
})
