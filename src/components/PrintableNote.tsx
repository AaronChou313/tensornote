import { forwardRef, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Note } from '../types'
import type { WorkspaceProvider } from '../workspace/types'
import type { KnowledgeIndex } from '../content/knowledgeIndex'
import { usePrintStore } from '../printing/usePrintStore'
import { MarkdownRenderer } from './MarkdownRenderer'

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

function imageReady(image: HTMLImageElement) {
  if (image.complete) return Promise.resolve()
  return new Promise<void>((resolve) => {
    image.addEventListener('load', () => resolve(), { once: true })
    image.addEventListener('error', () => resolve(), { once: true })
  })
}

async function waitForPrintableContent(root: HTMLElement) {
  let timeoutId = 0
  const timeout = new Promise<void>((resolve) => { timeoutId = window.setTimeout(resolve, 5000) })
  const assets = new Promise<void>((resolve) => {
    const started = Date.now()
    const check = () => {
      if (root.querySelector('.mermaid-loading, .workspace-image-loading') && Date.now() - started < 5000) {
        window.setTimeout(check, 50)
        return
      }
      void Promise.all([...root.querySelectorAll('img')].map(imageReady)).then(() => resolve())
    }
    check()
  })
  await Promise.race([Promise.all([assets, document.fonts?.ready ?? Promise.resolve()]), timeout])
  window.clearTimeout(timeoutId)
  await nextFrame()
}

interface PrintableNoteProps {
  note: Note
  provider: WorkspaceProvider
  knowledgeIndex?: KnowledgeIndex
}

export const PrintableNoteContent = forwardRef<HTMLElement, PrintableNoteProps>(function PrintableNoteContent({ note, provider, knowledgeIndex }, ref) {
  return (
    <article ref={ref} className="print-document note-prose" aria-label={`${note.frontmatter.title} 可打印文档`}>
      <header className="print-document__header">
        {note.frontmatter.section && <p className="note-section">{note.frontmatter.section}</p>}
        <h1>{note.frontmatter.title}</h1>
        {note.frontmatter.summary && <p className="note-summary">{note.frontmatter.summary}</p>}
        {note.frontmatter.tags.length > 0 && <div className="note-tags">{note.frontmatter.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
      </header>
      <MarkdownRenderer
        content={note.renderedContent}
        labs={note.labs}
        sidecars={note.sidecars}
        documentTitle={note.frontmatter.title}
        documentPath={note.path}
        resolveAssetUrl={(path, fromDocument) => provider.resolveAssetUrl(path, fromDocument)}
        knowledgeIndex={knowledgeIndex}
        noteId={note.id}
        renderMode="print"
      />
    </article>
  )
})

export function PrintableNote({ note, provider, knowledgeIndex }: PrintableNoteProps) {
  const request = usePrintStore((state) => state.request)
  const completeNotePrint = usePrintStore((state) => state.completeNotePrint)
  const rootRef = useRef<HTMLElement>(null)
  const startedRequestRef = useRef<number | null>(null)

  useEffect(() => {
    if (!request || request.noteId !== note.id || !rootRef.current || startedRequestRef.current === request.id) return
    startedRequestRef.current = request.id
    let cancelled = false
    const previousTitle = document.title
    void waitForPrintableContent(rootRef.current).then(() => {
      if (cancelled) return
      document.title = `${note.frontmatter.title} · TensorNote`
      try { window.print() } finally {
        document.title = previousTitle
        completeNotePrint(request.id)
      }
    })
    return () => {
      cancelled = true
      if (startedRequestRef.current === request.id) startedRequestRef.current = null
    }
  }, [completeNotePrint, note, request])

  if (!request || request.noteId !== note.id) return null
  return createPortal(
    <PrintableNoteContent ref={rootRef} note={note} provider={provider} knowledgeIndex={knowledgeIndex} />,
    document.body,
  )
}
