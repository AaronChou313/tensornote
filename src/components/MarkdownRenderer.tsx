import { isValidElement, useMemo, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type { Lab } from '../types'
import { slugify } from '../content/document'
import { extractHeadingSection, transformWikiMarkdown, type KnowledgeIndex } from '../content/knowledgeIndex'
import { LabCard } from './LabCard'
import { MermaidDiagram } from './MermaidDiagram'
import { WorkspaceImage } from './WorkspaceImage'
import { useExtensionSnapshot } from '../extensions/ExtensionContext'

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
  documentTitle?: string
  documentPath?: string
  resolveAssetUrl?: (path: string, fromDocument: string) => Promise<string>
  knowledgeIndex?: KnowledgeIndex
  noteId?: string
  embeddedTrail?: string[]
}

export function MarkdownRenderer({ content, labs, documentTitle, documentPath = '', resolveAssetUrl, knowledgeIndex, noteId, embeddedTrail = [] }: MarkdownRendererProps) {
  const processors = useExtensionSnapshot().markdownProcessors
  const labMap = new Map(labs.map((lab) => [lab.id, lab]))
  const headingCounts = new Map<string, number>()
  const headingId = (children: ReactNode) => {
    const baseId = slugify(textFromNode(children))
    const count = headingCounts.get(baseId) ?? 0
    headingCounts.set(baseId, count + 1)
    return count ? `${baseId}-${count}` : baseId
  }
  const processedContent = processors.reduce((markdown, processor) => {
    try { return processor.process(markdown, { documentPath, noteId }) }
    catch (reason) { console.error(`Markdown processor failed: ${processor.id}`, reason); return markdown }
  }, content)
  const markdown = useMemo(
    () => knowledgeIndex && noteId ? transformWikiMarkdown(processedContent, knowledgeIndex, noteId) : processedContent,
    [knowledgeIndex, noteId, processedContent],
  )
  const firstH1Offset = markdown.search(/^#\s+/m)

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
      components={{
        h1: ({ children, node }) => {
          const duplicateDocumentTitle = firstH1Offset >= 0
            && node?.position?.start.offset === firstH1Offset
            && textFromNode(children).trim() === documentTitle?.trim()
          return <h1 id={headingId(children)} className={duplicateDocumentTitle ? 'markdown-title-heading' : undefined}>{children}</h1>
        },
        h2: ({ children }) => <h2 id={headingId(children)}>{children}</h2>,
        h3: ({ children }) => <h3 id={headingId(children)}>{children}</h3>,
        h4: ({ children }) => <h4 id={headingId(children)}>{children}</h4>,
        h5: ({ children }) => <h5 id={headingId(children)}>{children}</h5>,
        h6: ({ children }) => <h6 id={headingId(children)}>{children}</h6>,
        a: ({ href = '', children }) => {
          if (href.startsWith('/notes/')) return <Link className="knowledge-link" to={href}>{children}</Link>
          const resolved = knowledgeIndex && noteId ? knowledgeIndex.resolveMarkdownHref(href, noteId) : undefined
          if (resolved) {
            const fragment = resolved.heading ? `#${resolved.heading.id}` : ''
            return <Link className="knowledge-link" to={`/notes/${encodeURIComponent(resolved.note.id)}${fragment}`}>{children}</Link>
          }
          if (href.startsWith('#')) return <a href={href}>{children}</a>
          return <a href={href} target="_blank" rel="noreferrer">{children}</a>
        },
        img: ({ src, alt }) => (
          <WorkspaceImage src={src ?? ''} alt={alt ?? ''} documentPath={documentPath} resolveAssetUrl={resolveAssetUrl} />
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
          if (language === 'mermaid') return <MermaidDiagram chart={source} />
          if (language === 'tensornote-lab') {
            const lab = labMap.get(source.trim())
            return lab ? <LabCard lab={lab} noteId={noteId} /> : null
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
                <header><span>Embedded note</span><Link to={`/notes/${resolved.note.id}${resolved.heading ? `#${resolved.heading.id}` : ''}`}>{resolved.note.frontmatter.title}</Link></header>
                <MarkdownRenderer
                  content={extractHeadingSection(resolved.note, resolved.heading?.id)}
                  labs={resolved.note.labs}
                  documentPath={resolved.note.path}
                  resolveAssetUrl={resolveAssetUrl}
                  knowledgeIndex={knowledgeIndex}
                  noteId={resolved.note.id}
                  embeddedTrail={[...embeddedTrail, noteId]}
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
            className === 'language-mermaid' || className === 'language-tensornote-lab' || className === 'language-tensornote-embed',
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
