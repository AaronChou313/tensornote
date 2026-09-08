// @vitest-environment jsdom
import { StrictMode } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { parseDocument } from '../content/document'
import type { Lab } from '../types'
import { MarkdownRenderer } from './MarkdownRenderer'

const lab: Lab = {
  id: 'demo',
  title: 'Demo Lab',
  difficulty: 'basic',
  cells: [
    {
      id: 'demo-1',
      lab: 'demo',
      order: 1,
      title: 'First cell',
      difficulty: 'basic',
      code: 'print("hello")',
    },
  ],
}

describe('MarkdownRenderer', () => {
  it('renders README HTML layouts, badges and explicit image dimensions', () => {
    const html = renderToStaticMarkup(<MarkdownRenderer content={'<div align="center"><img src="./images/head.jpg" width="100%" alt="banner"><h1>Happy-LLM</h1><a href="https://example.com"><img src="https://example.com/badge.svg" width="250" height="55" alt="badge"></a></div>'} labs={[]} />)
    expect(html).toContain('<div align="center">')
    expect(html).toContain('width="100%"')
    expect(html).toContain('height="55"')
    expect(html).toContain('<h1 id="happy-llm">Happy-LLM</h1>')
    expect(html).not.toContain('&lt;div')
  })

  it('resolves HTML image paths through the workspace provider', async () => {
    const resolveAssetUrl = vi.fn().mockResolvedValue('blob:resolved-workspace-image')
    const view = render(<MarkdownRenderer content={'<img src="./images/head.jpg" width="100%" alt="local banner">'} labs={[]} documentPath="README.md" resolveAssetUrl={resolveAssetUrl} />)
    await waitFor(() => expect(view.container.querySelector('img')?.getAttribute('src')).toBe('blob:resolved-workspace-image'))
    expect(resolveAssetUrl).toHaveBeenCalledWith('./images/head.jpg', 'README.md')
    expect(view.container.querySelector('img')?.getAttribute('width')).toBe('100%')
  })

  it('removes executable HTML, dangerous URLs, CSS and event handlers', () => {
    const html = renderToStaticMarkup(<MarkdownRenderer content={'<div style="position:fixed" onclick="alert(1)"><script>alert(1)</script><iframe src="https://example.com"></iframe><img src="javascript:alert(1)" onerror="alert(1)"><a href="javascript:alert(1)">unsafe</a><form action="https://example.com"><input name="secret"></form>safe</div>'} labs={[]} />)
    expect(html).not.toMatch(/<script|<iframe|<form|onclick|onerror|javascript:|position:fixed|alert\(1\)/)
    expect(html).toContain('safe')
  })

  it('keeps math rendering and literal HTML code fences after sanitization', () => {
    const html = renderToStaticMarkup(<MarkdownRenderer content={'$x^2$\n\n```html\n<div>example</div>\n```'} labs={[]} />)
    expect(html).toContain('class="katex"')
    expect(html).toContain('<pre>')
    expect(html).toContain('&lt;')
    expect(html).not.toContain('<div>example</div>')
  })

  it('scrolls README fragment links within their own pane without replacing the app route', () => {
    const { container } = render(<><section className="note-prose"><MarkdownRenderer content={'[目录](#%E7%AB%A0%E8%8A%82)\n\n## 章节'} labs={[]} /></section><section className="note-prose"><MarkdownRenderer content={'## 章节'} labs={[]} /></section></>)
    const headings = container.querySelectorAll('h2')
    const first = vi.fn(), second = vi.fn()
    headings[0].scrollIntoView = first
    headings[1].scrollIntoView = second
    const hash = window.location.hash
    expect(fireEvent.click(container.querySelector('a')!)).toBe(false)
    expect(first).toHaveBeenCalledOnce()
    expect(second).not.toHaveBeenCalled()
    expect(window.location.hash).toBe(hash)
  })

  it('keeps ordinary fenced code in a pre element', () => {
    const html = renderToStaticMarkup(<MarkdownRenderer content={'```python\nprint("hello")\n```'} labs={[]} />)

    expect(html).toContain('<pre><code class="hljs language-python"')
  })

  it('renders Mermaid and Lab blocks without a pre wrapper', () => {
    const markdown = ['```mermaid', 'flowchart LR', 'A --> B', '```', '', '```tensornote-lab', 'demo', '```'].join('\n')
    const html = renderToStaticMarkup(<MarkdownRenderer content={markdown} labs={[lab]} />)

    expect(html).toContain('class="mermaid-loading"')
    expect(html).toContain('class="lab-card group"')
    expect(html).not.toMatch(/<pre>\s*<div class="mermaid-/)
    expect(html).not.toMatch(/<pre>\s*<button class="lab-card/)
  })

  it('marks only the duplicated document title while keeping later H1 headings visible', () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer content={'# Document title\n\nIntro\n\n# A real section'} documentTitle="Document title" labs={[]} />,
    )

    expect(html.match(/markdown-title-heading/g)).toHaveLength(1)
    expect(html).toContain('<h1 id="a-real-section">A real section</h1>')
  })

  it('keeps the duplicate-title marker stable during strict client rendering', () => {
    const { container } = render(
      <StrictMode><MarkdownRenderer content={'# Document title\n\n# A real section'} documentTitle="Document title" labs={[]} /></StrictMode>,
    )

    expect(container.querySelectorAll('h1')).toHaveLength(2)
    expect(container.querySelector('h1')?.className).toBe('markdown-title-heading')
    expect(container.querySelectorAll('.markdown-title-heading')).toHaveLength(1)
  })
  it('keeps indexed heading IDs stable across strict rendering and updates', () => {
    const content = '# 标题\n\n## **重复**\n\n## **重复**\n\n```md\n## Ignored\n```'
    const note = parseDocument('notes/test.md', `---\nid: test\ntitle: 标题\n---\n${content}`)
    const view = render(<StrictMode><MarkdownRenderer content={content} labs={[]} /></StrictMode>)
    const ids = () => [...view.container.querySelectorAll('h1,h2')].map((heading) => heading.id)
    expect(ids()).toEqual(note.headings.map((heading) => heading.id))
    expect(ids()).toEqual(['标题', '重复', '重复-1'])
    view.rerender(<StrictMode><MarkdownRenderer content={`${content}\n\n## Last`} labs={[]} /></StrictMode>)
    expect(ids()).toEqual(['标题', '重复', '重复-1', 'last'])
  })

})
