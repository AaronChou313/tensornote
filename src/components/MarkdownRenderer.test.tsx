// @vitest-environment jsdom
import { StrictMode } from 'react'
import { render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
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
})
