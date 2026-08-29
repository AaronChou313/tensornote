import { Children, isValidElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type { Lab } from '../types'
import { slugify } from '../content/notes'
import { LabCard } from './LabCard'
import { MermaidDiagram } from './MermaidDiagram'

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

export function MarkdownRenderer({ content, labs }: { content: string; labs: Lab[] }) {
  const labMap = new Map(labs.map((lab) => [lab.id, lab]))

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
      components={{
        h1: ({ children }) => <h1 id={slugify(textFromNode(children))}>{children}</h1>,
        h2: ({ children }) => <h2 id={slugify(textFromNode(children))}>{children}</h2>,
        h3: ({ children }) => <h3 id={slugify(textFromNode(children))}>{children}</h3>,
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
            return lab ? <LabCard lab={lab} /> : null
          }
          const inline = !className && !source.includes('\n')
          if (inline) return <code {...props}>{children}</code>
          return <code className={className} {...props}>{children}</code>
        },
        pre: ({ children }) => {
          const child = Children.toArray(children)[0]
          if (isValidElement(child) && (child.type === LabCard || child.type === MermaidDiagram)) return <>{children}</>
          return <pre>{children}</pre>
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
