import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { redo, undo } from '@codemirror/commands'
import type { EditorView } from '@codemirror/view'
import {
  ArrowCounterClockwise,
  ArrowClockwise,
  CheckSquare,
  Code,
  CodeBlock,
  Columns,
  DotsThree,
  Eye,
  FloppyDisk,
  Image,
  LinkSimple,
  ListBullets,
  ListNumbers,
  MathOperations,
  Minus,
  NotePencil,
  Paragraph,
  Quotes,
  SlidersHorizontal,
  Table,
  TextB,
  TextHFive,
  TextHFour,
  TextHOne,
  TextHSix,
  TextHThree,
  TextHTwo,
  TextItalic,
  TextStrikethrough,
  TextT,
  UploadSimple,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import type { Note } from '../types'
import { getDocumentBody, getDocumentProperties, parseDocument, replaceDocumentBody, updateDocumentProperties, type DocumentProperties } from '../content/document'
import { dirname, joinWorkspacePath, relativeWorkspacePath } from '../workspace/path'
import { WorkspaceConflictError, type WorkspaceFileStat, type WorkspaceProvider } from '../workspace/types'
import { useAppStore } from '../store/useAppStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { Button } from './ui/Button'
import { MarkdownRenderer } from './MarkdownRenderer'
import { NoteProgress } from './NoteProgress'
import { KnowledgePanel } from './KnowledgePanel'
import { useCommandRegistry } from '../commands/CommandContext'
import { editorCommandLabels, transformEditorCommand, type EditorCommandId } from '../commands/editor'
import { useExtensionSnapshot } from '../extensions/ExtensionContext'

type EditorMode = 'read' | 'edit' | 'split'

function NotePreview({ note, provider, compact = false }: { note: Note; provider: WorkspaceProvider; compact?: boolean }) {
  const session = useWorkspaceStore((state) => state.session)
  return (
    <article className={compact ? 'note-prose note-prose--preview' : 'note-prose'}>
      <header className="note-header">
        <p className="note-section">{note.frontmatter.section}</p>
        <h1>{note.frontmatter.title}</h1>
        {note.frontmatter.summary && <p className="note-summary">{note.frontmatter.summary}</p>}
        <div className="note-tags">{note.frontmatter.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      </header>
      <MarkdownRenderer
        content={note.renderedContent}
        labs={note.labs}
        documentPath={note.path}
        resolveAssetUrl={(path, fromDocument) => provider.resolveAssetUrl(path, fromDocument)}
        knowledgeIndex={session?.knowledgeIndex}
        noteId={note.id}
      />
      {!compact && session && <NoteProgress noteId={`${session.descriptor.id}:${note.id}`} hasLab={note.labs.length > 0} />}
    </article>
  )
}

function PropertiesPanel({ raw, onChange, onClose }: { raw: string; onChange: (raw: string) => void; onClose: () => void }) {
  const properties = getDocumentProperties(raw)
  const update = (patch: Partial<DocumentProperties>) => onChange(updateDocumentProperties(raw, { ...properties, ...patch }))

  return (
    <aside className="properties-panel" aria-label="Markdown Properties">
      <header><div><span>Frontmatter</span><h2>Document properties</h2></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭属性"><X size={17} /></Button></header>
      <div className="properties-panel__body">
        <label><span>Title</span><input value={properties.title} onChange={(event) => update({ title: event.target.value })} /></label>
        <label><span>Aliases</span><input value={properties.aliases.join(', ')} onChange={(event) => update({ aliases: event.target.value.split(',') })} placeholder="alternate title, abbreviation" /></label>
        <label><span>Section</span><input value={properties.section} onChange={(event) => update({ section: event.target.value })} /></label>
        <label><span>Tags</span><input value={properties.tags.join(', ')} onChange={(event) => update({ tags: event.target.value.split(',') })} placeholder="tag-one, tag-two" /></label>
        <label><span>Summary</span><textarea value={properties.summary} onChange={(event) => update({ summary: event.target.value })} rows={5} /></label>
        <p>属性仍会写回 Markdown Frontmatter，不创建额外数据库。</p>
      </div>
    </aside>
  )
}

function safeAssetName(name: string) {
  return name.trim().replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '') || 'asset'
}

const formattingGroups: { label: string; commands: EditorCommandId[] }[] = [
  { label: 'Text', commands: ['editor.paragraph', 'editor.heading1', 'editor.heading2', 'editor.heading3', 'editor.heading4', 'editor.heading5', 'editor.heading6'] },
  { label: 'Inline', commands: ['editor.bold', 'editor.italic', 'editor.strikethrough', 'editor.inlineCode', 'editor.link', 'editor.image'] },
  { label: 'Blocks', commands: ['editor.blockquote', 'editor.callout', 'editor.bulletList', 'editor.numberedList', 'editor.taskList', 'editor.codeFence', 'editor.table', 'editor.horizontalRule', 'editor.mathBlock'] },
]
const primaryFormattingCommands: EditorCommandId[] = ['editor.paragraph', 'editor.heading1', 'editor.bold', 'editor.italic', 'editor.link', 'editor.blockquote', 'editor.bulletList', 'editor.codeFence']
const codeLanguages = ['python', 'javascript', 'typescript', 'bash', 'json', 'markdown', 'plain']

function FormattingIcon({ id }: { id: EditorCommandId }) {
  const props = { size: 16, weight: 'bold' as const }
  if (id === 'editor.paragraph') return <Paragraph {...props} />
  if (id === 'editor.heading1') return <TextHOne {...props} />
  if (id === 'editor.heading2') return <TextHTwo {...props} />
  if (id === 'editor.heading3') return <TextHThree {...props} />
  if (id === 'editor.heading4') return <TextHFour {...props} />
  if (id === 'editor.heading5') return <TextHFive {...props} />
  if (id === 'editor.heading6') return <TextHSix {...props} />
  if (id === 'editor.bold') return <TextB {...props} />
  if (id === 'editor.italic') return <TextItalic {...props} />
  if (id === 'editor.strikethrough') return <TextStrikethrough {...props} />
  if (id === 'editor.inlineCode') return <Code {...props} />
  if (id === 'editor.link') return <LinkSimple {...props} />
  if (id === 'editor.image') return <Image {...props} />
  if (id === 'editor.blockquote' || id === 'editor.callout') return <Quotes {...props} />
  if (id === 'editor.bulletList') return <ListBullets {...props} />
  if (id === 'editor.numberedList') return <ListNumbers {...props} />
  if (id === 'editor.taskList') return <CheckSquare {...props} />
  if (id === 'editor.codeFence') return <CodeBlock {...props} />
  if (id === 'editor.table') return <Table {...props} />
  if (id === 'editor.horizontalRule') return <Minus {...props} />
  if (id === 'editor.mathBlock') return <MathOperations {...props} />
  return <TextT {...props} />
}

export function NoteEditor({ note, provider, isActive = true }: { note: Note; provider: WorkspaceProvider; isActive?: boolean }) {
  const theme = useAppStore((state) => state.theme)
  const setEditorDirty = useAppStore((state) => state.setEditorDirty)
  const saveDocument = useWorkspaceStore((state) => state.saveDocument)
  const refreshWorkspace = useWorkspaceStore((state) => state.refreshWorkspace)
  const writeAsset = useWorkspaceStore((state) => state.writeAsset)
  const [mode, setMode] = useState<EditorMode>('read')
  const [draft, setDraft] = useState(note.raw)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [propertiesOpen, setPropertiesOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [externalStat, setExternalStat] = useState<WorkspaceFileStat | null>(null)
  const [codeLanguage, setCodeLanguage] = useState('python')
  const viewRef = useRef<EditorView | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const baselineRef = useRef({ modifiedAt: note.sourceModifiedAt, size: note.sourceSize })
  const dirtyRef = useRef(dirty)
  const registry = useCommandRegistry()
  const extensionEditorExtensions = useExtensionSnapshot().editorExtensions

  useEffect(() => { dirtyRef.current = dirty }, [dirty])

  useEffect(() => {
    setEditorDirty(note.path, dirty)
    return () => setEditorDirty(note.path, false)
  }, [dirty, note.path, setEditorDirty])

  useEffect(() => {
    if (!dirtyRef.current) setDraft(note.raw)
    baselineRef.current = { modifiedAt: note.sourceModifiedAt, size: note.sourceSize }
  }, [note.path, note.raw, note.sourceModifiedAt, note.sourceSize])

  useEffect(() => {
    if (!provider.watch) return
    return provider.watch(note.path, (stat) => {
      const baseline = baselineRef.current
      if (stat.modifiedAt === baseline.modifiedAt && stat.size === baseline.size) return
      setExternalStat(stat)
    })
  }, [note.path, provider])

  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    const guardNavigation = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest('a[href]')
      if (anchor && !window.confirm('这篇笔记还有未保存修改，确定离开吗？')) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', guardNavigation, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', guardNavigation, true)
    }
  }, [dirty])

  const preview = useMemo(() => {
    try { return parseDocument(note.path, draft) } catch { return note }
  }, [draft, note])

  const editableBody = useMemo(() => getDocumentBody(draft), [draft])

  const changeDraft = useCallback((value: string) => {
    setDraft(value)
    setDirty(value !== note.raw)
    setMessage(null)
  }, [note.raw])

  const changeBody = useCallback((value: string) => changeDraft(replaceDocumentBody(draft, value)), [changeDraft, draft])

  const executeEditorCommand = useCallback((id: EditorCommandId) => {
    if (!isActive || mode === 'read') return
    const view = viewRef.current
    const selection = view ? { from: view.state.selection.main.from, to: view.state.selection.main.to } : { from: editableBody.length, to: editableBody.length }
    const result = transformEditorCommand(id, editableBody, selection, { codeLanguage })
    if (view) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: result.value }, selection: { anchor: result.selection.from, head: result.selection.to }, userEvent: 'input.format' })
      view.focus()
    } else {
      changeBody(result.value)
    }
  }, [changeBody, codeLanguage, editableBody, isActive, mode])

  useEffect(() => {
    if (!isActive) return
    const remove = (Object.keys(editorCommandLabels) as EditorCommandId[]).map((id) => registry.register({
      id,
      label: editorCommandLabels[id],
      category: 'Editor',
      shortcut: id === 'editor.bold' ? '⌘B' : id === 'editor.italic' ? '⌘I' : id === 'editor.link' ? '⌘K' : undefined,
      isAvailable: () => mode !== 'read',
      execute: () => executeEditorCommand(id),
    }))
    return () => remove.forEach((unregister) => unregister())
  }, [executeEditorCommand, isActive, mode, registry])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isActive || mode === 'read' || !(event.metaKey || event.ctrlKey)) return
      const id = event.key.toLowerCase() === 'b' ? 'editor.bold' : event.key.toLowerCase() === 'i' ? 'editor.italic' : event.key.toLowerCase() === 'k' ? 'editor.link' : null
      if (id) { event.preventDefault(); executeEditorCommand(id) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [executeEditorCommand, isActive, mode])

  const save = useCallback(async () => {
    if (!dirty || saving) return
    setSaving(true)
    setMessage(null)
    try {
      const saved = await saveDocument(note.path, draft, {
        expectedModifiedAt: baselineRef.current.modifiedAt,
        expectedSize: baselineRef.current.size,
      })
      baselineRef.current = { modifiedAt: saved.sourceModifiedAt, size: saved.sourceSize }
      setDraft(saved.raw)
      setDirty(false)
      setExternalStat(null)
      setMessage('Saved')
    } catch (reason) {
      setMessage(reason instanceof WorkspaceConflictError ? '外部文件已变化，请先选择重新载入或保留当前内容。' : reason instanceof Error ? reason.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }, [dirty, draft, note.path, saveDocument, saving])

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (isActive && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [isActive, save])

  const reloadExternal = async () => {
    setDirty(false)
    dirtyRef.current = false
    const session = await refreshWorkspace()
    const fresh = session.documents.find((item) => item.path === note.path)
    if (fresh) {
      setDraft(fresh.raw)
      baselineRef.current = { modifiedAt: fresh.sourceModifiedAt, size: fresh.sourceSize }
    }
    setExternalStat(null)
    setMessage('Reloaded from disk')
  }

  const keepEditing = () => {
    if (externalStat) baselineRef.current = { modifiedAt: externalStat.modifiedAt, size: externalStat.size }
    setExternalStat(null)
    setMessage('继续编辑；下次保存将覆盖外部版本。')
  }

  const insertAtCursor = (text: string) => {
    const view = viewRef.current
    if (!view) {
      changeBody(`${editableBody}${editableBody.endsWith('\n') ? '' : '\n'}${text}`)
      return
    }
    const range = view.state.selection.main
    view.dispatch({ changes: { from: range.from, to: range.to, insert: text }, selection: { anchor: range.from + text.length } })
    view.focus()
  }

  const upload = async (file: File) => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const assetPath = joinWorkspacePath(useWorkspaceStore.getState().session?.manifest.assets.root || 'assets', `${stamp}-${safeAssetName(file.name)}`)
    await writeAsset(assetPath, await file.arrayBuffer())
    const relative = relativeWorkspacePath(dirname(note.path), assetPath)
    insertAtCursor(file.type.startsWith('image/') ? `![${file.name}](${relative})` : `[${file.name}](${relative})`)
    setMessage(`已添加 ${file.name}`)
  }

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const image = [...event.clipboardData.files].find((file) => file.type.startsWith('image/'))
    if (!image) return
    event.preventDefault()
    void upload(image)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const file = event.dataTransfer.files[0]
    if (!file) return
    event.preventDefault()
    void upload(file)
  }

  return (
    <main className={`note-page note-page--authoring note-page--knowledge mode-${mode}`}>
      <header className="authoring-toolbar">
        <div className="mode-switcher" aria-label="阅读与编辑模式">
          <button className={mode === 'read' ? 'is-active' : ''} onClick={() => setMode('read')}><Eye size={15} />Reading</button>
          <button className={mode === 'edit' ? 'is-active' : ''} onClick={() => setMode('edit')}><NotePencil size={15} />Editing</button>
          <button className={mode === 'split' ? 'is-active' : ''} onClick={() => setMode('split')}><Columns size={15} />Split</button>
        </div>
        <div className="authoring-toolbar__actions">
          {mode !== 'read' && <>
            <Button variant="ghost" size="icon" onClick={() => viewRef.current && undo(viewRef.current)} aria-label="撤销"><ArrowCounterClockwise size={17} /></Button>
            <Button variant="ghost" size="icon" onClick={() => viewRef.current && redo(viewRef.current)} aria-label="重做"><ArrowClockwise size={17} /></Button>
            <Button variant="ghost" size="sm" onClick={() => uploadRef.current?.click()}><UploadSimple size={15} />Asset</Button>
            <Button variant={propertiesOpen ? 'secondary' : 'ghost'} size="sm" onClick={() => setPropertiesOpen((value) => !value)} aria-expanded={propertiesOpen} aria-controls="document-properties"><SlidersHorizontal size={15} />Properties</Button>
          </>}
          <span className={`save-state ${dirty ? 'save-state--dirty' : ''}`}>{dirty ? 'Unsaved' : message || 'Saved'}</span>
          <Button variant="primary" size="sm" onClick={() => void save()} disabled={!dirty || saving}><FloppyDisk size={15} />{saving ? 'Saving' : 'Save'}</Button>
          <input ref={uploadRef} className="sr-only" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = '' }} />
        </div>
      </header>
      {mode !== 'read' && <div className="formatting-toolbar" role="toolbar" aria-label="Markdown formatting">
        <div className="formatting-toolbar__group">{primaryFormattingCommands.map((id) => <button key={id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => executeEditorCommand(id)} aria-label={editorCommandLabels[id]} title={`${editorCommandLabels[id]}${id === 'editor.bold' ? ' (⌘B)' : id === 'editor.italic' ? ' (⌘I)' : id === 'editor.link' ? ' (⌘K)' : ''}`}><FormattingIcon id={id} /></button>)}<label className="formatting-toolbar__language"><select value={codeLanguage} onChange={(event) => setCodeLanguage(event.target.value)} aria-label="代码块语言">{codeLanguages.map((language) => <option key={language} value={language}>{language}</option>)}</select></label></div>
        <details className="formatting-toolbar__more"><summary aria-label="更多 Markdown 格式工具" title="More formatting"><DotsThree size={18} weight="bold" /></summary><div>{formattingGroups.flatMap((group) => group.commands).filter((id) => !primaryFormattingCommands.includes(id)).map((id) => <button key={id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => executeEditorCommand(id)} aria-label={editorCommandLabels[id]} title={editorCommandLabels[id]}><FormattingIcon id={id} /></button>)}</div></details>
      </div>}

      {externalStat && (
        <div className="external-change-banner" role="alert">
          <WarningCircle size={18} />
          <p>磁盘上的文件已发生变化。重新载入可避免覆盖其他编辑器的修改。</p>
          <Button variant="secondary" size="sm" onClick={() => void reloadExternal()}>Reload</Button>
          <Button variant="ghost" size="sm" onClick={keepEditing}>Keep mine</Button>
        </div>
      )}
      {message && message !== 'Saved' && message !== 'Reloaded from disk' && <div className="authoring-message">{message}</div>}

      <div className="authoring-stage">
        {mode !== 'read' && (
          <section className="markdown-editor-pane" onPasteCapture={handlePaste} onDragOver={(event) => event.preventDefault()} onDropCapture={handleDrop} aria-label="Markdown Editor">
            <div className="editor-file-label"><span>{note.path}</span><small>Markdown source</small></div>
            <CodeMirror
              value={editableBody}
              extensions={[markdown(), ...extensionEditorExtensions.map((item) => item.extension)]}
              theme={theme}
              minHeight="calc(100dvh - 166px)"
              basicSetup={{ lineNumbers: true, foldGutter: true, history: true, autocompletion: true, highlightActiveLine: true }}
              onCreateEditor={(view) => { viewRef.current = view }}
              onChange={changeBody}
            />
          </section>
        )}
        {mode !== 'edit' && <section className="markdown-preview-pane" aria-label="Markdown Preview"><NotePreview note={preview} provider={provider} compact={mode === 'split'} /></section>}
        {mode === 'read' && <KnowledgePanel noteId={note.id} />}
        {propertiesOpen && mode !== 'read' && <div id="document-properties"><PropertiesPanel raw={draft} onChange={changeDraft} onClose={() => setPropertiesOpen(false)} /></div>}
      </div>
    </main>
  )
}
