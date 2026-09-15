import { isValidElement, useMemo, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { safeHtmlSchema, imageDimension } from '../content/safeHtml'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type { Lab } from '../types'
import type { Sidecar } from '../sidecar/types'
import { rehypeHeadingIds } from '../content/rehypeHeadingIds'
import { extractHeadingSection, transformWikiMarkdown, type KnowledgeIndex } from '../content/knowledgeIndex'
import { LabCard } from './LabCard'
import { SidecarCard } from './SidecarCard'
import { MermaidDiagram } from './MermaidDiagram'
import { WorkspaceImage } from './WorkspaceImage'
import { scrollToHeading } from '../workbench/headingNavigation'

const calloutLabels: Record<string, string> = {
  intuition: '直觉',
  important: '重点',
  pitfall: '易错',
  bridge: '知识衔接',
  question: '问题',
  remember: '需要记住',
}

function textFromNode(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textFromNode).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return textFromNode(node.props.children)
  return ''
}

interface MarkdownRendererProps {
  content: string
  labs: Lab[]
  sidecars?: Sidecar[]
  documentTitle?: string
  documentPath?: string
  resolveAssetUrl?: (path: string, fromDocument: string) => Promise<string>
  knowledgeIndex?: KnowledgeIndex
  noteId?: string
  embeddedTrail?: string[]
  renderMode?: 'interactive' | 'print'
}

function PrintableSidecar({ sidecar, rendererProps }: { sidecar: Sidecar; rendererProps: MarkdownRendererProps }) {
  const label = sidecar.type === 'jupyter' ? 'Python 实验' : '补充推导'
  return (
    <section className={`print-sidecar print-sidecar--${sidecar.type}`}>
      <header className="print-sidecar__header"><p>{label}</p><h2>{sidecar.title}</h2></header>
      {sidecar.type === 'derivation' ? (
        <MarkdownRenderer {...rendererProps} content={sidecar.markdown} labs={[]} sidecars={[]} renderMode="print" />
      ) : (
        <div className="print-sidecar__cells">
          {sidecar.cells.map((cell, index) => (
            <section className="print-sidecar__cell" key={cell.id}>
              <h3>{cell.title || `Cell ${index + 1}`}</h3>
              <MarkdownRenderer {...rendererProps} content={`\`\`\`python\n${cell.code}\n\`\`\``} labs={[]} sidecars={[]} renderMode="print" />
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

export function MarkdownRenderer({ content, labs, sidecars = [], documentTitle, documentPath = '', resolveAssetUrl, knowledgeIndex, noteId, embeddedTrail = [], renderMode = 'interactive' }: MarkdownRendererProps) {
  const labMap = new Map(labs.map((lab) => [lab.id, lab]))
  const sidecarMap = new Map(sidecars.map((sidecar) => [sidecar.id, sidecar]))
  const markdown = useMemo(
    () => knowledgeIndex && noteId ? transformWikiMarkdown(content, knowledgeIndex, noteId) : content,
    [content, knowledgeIndex, noteId],
  )
  const firstH1Offset = markdown.search(/^#\s+/m)

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, safeHtmlSchema], rehypeHeadingIds, rehypeKatex, rehypeHighlight]}
      components={{
        h1: ({ children, node }) => {
          const duplicateDocumentTitle = firstH1Offset >= 0
            && node?.position?.start.offset === firstH1Offset
            && textFromNode(children).trim() === documentTitle?.trim()
          return <h1 id={String(node?.properties.id ?? '')} className={duplicateDocumentTitle ? 'markdown-title-heading' : undefined}>{children}</h1>
        },
        h2: ({ children, node }) => <h2 id={String(node?.properties.id ?? '')}>{children}</h2>,
        h3: ({ children, node }) => <h3 id={String(node?.properties.id ?? '')}>{children}</h3>,
        h4: ({ children, node }) => <h4 id={String(node?.properties.id ?? '')}>{children}</h4>,
        h5: ({ children, node }) => <h5 id={String(node?.properties.id ?? '')}>{children}</h5>,
        h6: ({ children, node }) => <h6 id={String(node?.properties.id ?? '')}>{children}</h6>,
        a: ({ href = '', children }) => {
          if (href.startsWith('/notes/')) return <Link className="knowledge-link" to={href}>{children}</Link>
          const resolved = knowledgeIndex?.resolveMarkdownHref(href, noteId ?? '')
          if (resolved) {
            const fragment = resolved.heading ? `#${resolved.heading.id}` : ''
            return <Link className="knowledge-link" to={`/notes/${encodeURIComponent(resolved.note.id)}${fragment}`}>{children}</Link>
          }
          if (href.startsWith('#')) return <a href={href} onClick={(event) => {
            // Fragment-only README links must not replace the HashRouter route.
            event.preventDefault()
            const root = event.currentTarget.closest('.note-prose, .embedded-note')
            if (!root) return
            let id = href.slice(1)
            try { id = decodeURIComponent(id) } catch { /* Keep malformed fragments inert. */ }
            scrollToHeading(root, id)
          }}>{children}</a>
          return <a href={href} target="_blank" rel="noreferrer">{children}</a>
        },
        img: ({ src, alt, width, height, title }) => (
          <WorkspaceImage src={src ?? ''} alt={alt ?? ''} width={imageDimension(width)} height={imageDimension(height)} title={title} documentPath={documentPath} resolveAssetUrl={resolveAssetUrl} />
        ),
        blockquote: ({ children }) => {
          const text = textFromNode(children).trim()
          const match = text.match(/^\[!(\w+)]\s*([\s\S]*)$/)
          if (!match || !calloutLabels[match[1]]) return <blockquote>{children}</blockquote>
          return (
            <aside className={`callout callout--${match[1]}`}>
              <strong>{calloutLabels[match[1]]}</strong>
              <p>{match[2]}</p>
            </aside>
          )
        },
        code: ({ className, children, ...props }) => {
          const language = /language-([\w-]+)/.exec(className ?? '')?.[1]
          const source = String(children).replace(/\n$/, '')
          if (language === 'mermaid') return <MermaidDiagram chart={source} renderTheme={renderMode === 'print' ? 'light' : undefined} />
          if (language === 'tensornote-lab') {
            const lab = labMap.get(source.trim())
            const printableSidecar = sidecarMap.get(source.trim())
            if (renderMode === 'print' && printableSidecar) return <PrintableSidecar sidecar={printableSidecar} rendererProps={{ content: '', labs: [], documentPath, resolveAssetUrl, knowledgeIndex, noteId, embeddedTrail, renderMode }} />
            return lab ? <LabCard lab={lab} noteId={noteId} /> : null
          }
          if (language === 'tensornote-sidecar') {
            const sidecar = sidecarMap.get(source.trim())
            if (renderMode === 'print' && sidecar) return <PrintableSidecar sidecar={sidecar} rendererProps={{ content: '', labs: [], documentPath, resolveAssetUrl, knowledgeIndex, noteId, embeddedTrail, renderMode }} />
            return sidecar ? <SidecarCard sidecar={sidecar} noteId={noteId} /> : null
          }
          if (language === 'tensornote-embed' && knowledgeIndex && noteId) {
            const reference = source.trim()
            const resolved = knowledgeIndex.resolveReference(reference, noteId)
            if (!resolved) return <aside className="embedded-note embedded-note--missing">嵌入的笔记无法解析：{reference}</aside>
            if (embeddedTrail.includes(resolved.note.id) || resolved.note.id === noteId) {
              return <aside className="embedded-note embedded-note--missing">已阻止循环嵌入：{resolved.note.frontmatter.title}</aside>
            }
            return (
              <aside className="embedded-note">
                <header><span>Embedded note</span><Link to={`/notes/${encodeURIComponent(resolved.note.id)}${resolved.heading ? `#${resolved.heading.id}` : ''}`}>{resolved.note.frontmatter.title}</Link></header>
                <MarkdownRenderer
                  content={extractHeadingSection(resolved.note, resolved.heading?.id)}
                  labs={resolved.note.labs}
                  sidecars={resolved.note.sidecars}
                  documentPath={resolved.note.path}
                  resolveAssetUrl={resolveAssetUrl}
                  knowledgeIndex={knowledgeIndex}
                  noteId={resolved.note.id}
                  embeddedTrail={[...embeddedTrail, noteId]}
                  renderMode={renderMode}
                />
              </aside>
            )
          }
          const inline = !className && !source.includes('\n')
          if (inline) return <code {...props}>{children}</code>
          return <code className={className} {...props}>{children}</code>
        },
        pre: ({ children, node }) => {
          const codeNode = node?.children[0]
          const classNames = codeNode?.type === 'element' ? codeNode.properties.className : []
          const classes = Array.isArray(classNames) ? classNames.map(String) : [String(classNames ?? '')]
          const isCustomBlock = classes.some((className) =>
            className === 'language-mermaid' || className === 'language-tensornote-lab' || className === 'language-tensornote-sidecar' || className === 'language-tensornote-embed',
          )
          if (isCustomBlock) return <>{children}</>
          return <pre>{children}</pre>
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  )
}
