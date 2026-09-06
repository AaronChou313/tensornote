import { useMemo, useRef, useState } from 'react'
import { Copy, FilePlus, FolderPlus, PencilSimple, Trash, X } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { createDocumentTemplate, duplicateDocument, slugify } from '../content/document'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { basename, dirname, joinWorkspacePath, normalizeWorkspacePath } from '../workspace/path'
import { ModalSurface } from './ui/ModalSurface'
import { Button } from './ui/Button'
import { useAppStore } from '../store/useAppStore'

export type FileAction = 'new-note' | 'new-folder' | 'rename' | 'move' | 'duplicate' | 'delete'

export interface FileDialogRequest {
  action: FileAction
  path?: string
  kind?: 'file' | 'directory'
  noteId?: string
}

const actionMeta: Record<FileAction, { title: string; description: string }> = {
  'new-note': { title: 'New note', description: '创建一个带标准 Frontmatter 的 Markdown 文档。' },
  'new-folder': { title: 'New folder', description: '在内容目录中创建文件夹。' },
  rename: { title: 'Rename', description: '只修改名称，保留当前位置和文档 ID。' },
  move: { title: 'Move', description: '输入相对于 Workspace 根目录的完整目标路径。' },
  duplicate: { title: 'Duplicate', description: '复制文档，并生成新的 Frontmatter ID。' },
  delete: { title: 'Delete', description: '此操作会从本地文件夹删除所选内容。' },
}

function defaultValue(request: FileDialogRequest, contentRoot: string) {
  const source = request.path || contentRoot
  if (request.action === 'new-note') return joinWorkspacePath(contentRoot, 'untitled-note.md')
  if (request.action === 'new-folder') return joinWorkspacePath(contentRoot, 'new-folder')
  if (request.action === 'rename') return basename(source)
  if (request.action === 'move') return source
  if (request.action === 'duplicate') {
    const extension = source.toLowerCase().endsWith('.md') ? '.md' : ''
    const stem = extension ? basename(source).slice(0, -extension.length) : basename(source)
    return joinWorkspacePath(dirname(source), `${stem}-copy${extension}`)
  }
  return source
}

export function WorkspaceFileDialog({ request, onClose }: { request: FileDialogRequest | null; onClose: () => void }) {
  const navigate = useNavigate()
  const session = useWorkspaceStore((state) => state.session)
  const editorDirtyPaths = useAppStore((state) => state.editorDirtyPaths)
  const labDirty = useAppStore((state) => state.labDirty)
  const provider = useWorkspaceStore((state) => state.provider)
  const createNote = useWorkspaceStore((state) => state.createNote)
  const createFolder = useWorkspaceStore((state) => state.createFolder)
  const removeEntry = useWorkspaceStore((state) => state.removeEntry)
  const moveEntry = useWorkspaceStore((state) => state.moveEntry)
  const [value, setValue] = useState(() => request ? defaultValue(request, session?.manifest.content.root || '') : '')
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const meta = request ? actionMeta[request.action] : null

  const previewPath = useMemo(() => {
    if (!request) return ''
    if (request.action === 'rename' && request.path) return joinWorkspacePath(dirname(request.path), value)
    return normalizeWorkspacePath(value)
  }, [request, value])

  if (!request || !session || !provider || !meta) return null
  const destructive = request.action === 'delete'

  const submit = async () => {
    if (submitting.current || (!destructive && !previewPath)) return
    submitting.current = true
    setBusy(true)
    setError(null)
    try {
      if (!session.capabilities.write) throw new Error('当前工作区为只读，无法执行文件操作')
      const affectsDirtyDocument = Object.keys(editorDirtyPaths).some((dirtyPath) => (
        request.action === 'new-note'
        || request.action === 'duplicate'
        || request.path === dirtyPath
        || Boolean(request.path && dirtyPath.startsWith(`${request.path}/`))
      ))
      if (affectsDirtyDocument) throw new Error('请先保存或撤销当前笔记的未保存修改，再执行此文件操作')
      if (labDirty && (request.action === 'new-note' || request.action === 'duplicate' || request.action === 'delete' || request.action === 'move' || request.action === 'rename')) {
        throw new Error('请先把实验代码保存到 Markdown，或撤销实验修改')
      }
      const pathInsideContent = (path: string) => !session.manifest.content.root
        || path === session.manifest.content.root
        || path.startsWith(`${session.manifest.content.root}/`)
      if (!destructive && !pathInsideContent(previewPath)) throw new Error(`目标必须位于内容目录 ${session.manifest.content.root || '/'} 中`)
      if (request.action === 'new-note') {
        const path = previewPath.toLowerCase().endsWith('.md') ? previewPath : `${previewPath}.md`
        const title = basename(path).replace(/\.md$/i, '').replace(/[-_]+/g, ' ')
        let id = slugify(title) || 'note'
        if (session.documentById.has(id)) id = `${id}-${Date.now().toString(36)}`
        const note = await createNote(path, createDocumentTemplate(id, title))
        navigate(`/notes/${note.id}`)
      } else if (request.action === 'new-folder') {
        await createFolder(previewPath)
      } else if (request.action === 'delete' && request.path) {
        await removeEntry(request.path)
        if (request.noteId) navigate('/workspace')
      } else if ((request.action === 'rename' || request.action === 'move') && request.path) {
        const target = request.kind === 'file' && request.path.toLowerCase().endsWith('.md') && !previewPath.toLowerCase().endsWith('.md')
          ? `${previewPath}.md`
          : previewPath
        await moveEntry(request.path, target)
      } else if (request.action === 'duplicate' && request.path) {
        const source = session.documents.find((note) => note.path === request.path)
        if (!source) throw new Error('当前版本只支持复制 Markdown 文档')
        const title = `${source.frontmatter.title} Copy`
        let id = `${slugify(source.id)}-copy`
        if (session.documentById.has(id)) id = `${id}-${Date.now().toString(36)}`
        const target = previewPath.toLowerCase().endsWith('.md') ? previewPath : `${previewPath}.md`
        const note = await createNote(target, duplicateDocument(source.raw, id, title))
        navigate(`/notes/${note.id}`)
      }
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '文件操作失败')
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  const icon = request.action === 'new-note' ? <FilePlus size={20} />
    : request.action === 'new-folder' ? <FolderPlus size={20} />
      : request.action === 'duplicate' ? <Copy size={20} />
        : request.action === 'delete' ? <Trash size={20} />
          : <PencilSimple size={20} />

  return (
    <ModalSurface open onOpenChange={(open) => { if (!open && !submitting.current) onClose() }} title={meta.title} layerClassName="file-dialog-layer" className="file-dialog">
        <header>
          <span className={destructive ? 'is-danger' : ''}>{icon}</span>
          <div><h2 id="file-dialog-title">{meta.title}</h2><p>{meta.description}</p></div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={busy} aria-label="关闭文件操作"><X size={17} /></Button>
        </header>
        <div className="file-dialog__body">
          {destructive ? (
            <div className="delete-confirmation"><strong>{request.path}</strong><p>删除后 TensorNote 无法撤销。需要恢复时请使用系统备份或版本控制。</p></div>
          ) : (
            <label><span>{request.action === 'rename' ? 'Name' : 'Workspace path'}</span><input autoFocus disabled={busy} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void submit() } }} /><small>{previewPath}</small></label>
          )}
          {error && <p role="alert" className="file-dialog__error">{error}</p>}
        </div>
        <footer><Button variant="ghost" onClick={onClose} disabled={busy}>取消</Button><Button variant={destructive ? 'danger' : 'primary'} onClick={() => void submit()} disabled={busy || (!destructive && !previewPath)}>{busy ? '处理中…' : meta.title}</Button></footer>
    </ModalSurface>
  )
}
