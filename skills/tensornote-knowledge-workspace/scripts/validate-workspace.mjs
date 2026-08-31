#!/usr/bin/env node
import { access, readFile, readdir, stat } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'

const argv = process.argv.slice(2)
const strict = argv.includes('--strict')
const json = argv.includes('--json')
const rootArg = argv.find((argument) => !argument.startsWith('--'))

if (!rootArg) {
  console.error('Usage: validate-workspace.mjs <workspace-root> [--strict] [--json]')
  process.exit(2)
}

const root = resolve(rootArg)
const findings = []
const ignoredDirectories = new Set(['.git', '.venv', 'node_modules', 'dist', '.cache', '__pycache__'])

function report(severity, code, file, message) {
  findings.push({ severity, code, file: file ? relative(root, file) || '.' : '.', message })
}

async function exists(path) {
  try { await access(path); return true } catch { return false }
}

async function filesBelow(directory) {
  const result = []
  if (!await exists(directory)) return result
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) result.push(...await filesBelow(path))
    else if (entry.isFile()) result.push(path)
  }
  return result
}

function sectionBlock(source, name) {
  const match = source.match(new RegExp(`^${name}:\\s*(?:#.*)?\\n((?:[ \\t]+.*(?:\\n|$))*)`, 'm'))
  return match?.[1] ?? ''
}

function scalar(source, key) {
  const match = source.match(new RegExp(`^\\s*${key}:\\s*([^#\\n]+)`, 'm'))
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '')
}

function frontmatter(markdown) {
  if (!markdown.startsWith('---\n') && !markdown.startsWith('---\r\n')) return null
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  return match ? { yaml: match[1], body: markdown.slice(match[0].length) } : null
}

function yamlField(source, key) {
  return scalar(source, key)
}

function environmentFiles(manifest) {
  const environment = sectionBlock(manifest, 'environment')
  if (!environment) return []
  const inline = environment.match(/^\s*files:\s*\[([^\]]*)\]/m)
  if (inline) return inline[1].split(',').map((value) => value.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
  const block = environment.match(/^\s*files:\s*\n((?:\s{4,}-\s*[^\n]+\n?)*)/m)?.[1] ?? ''
  return [...block.matchAll(/^\s*-\s*([^#\n]+)/gm)].map((match) => match[1].trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
}

function safeWorkspacePath(value) {
  return Boolean(value) && !value.startsWith('/') && !value.startsWith('\\') && !value.split(/[\\/]+/).includes('..')
}

let rootStat
try { rootStat = await stat(root) } catch { rootStat = null }
if (!rootStat?.isDirectory()) {
  report('error', 'workspace-root', root, 'Workspace root does not exist or is not a directory')
}

let contentRoot = 'notes'
let assetsRoot = 'assets'
const manifestPath = join(root, 'tensornote.yaml')

if (rootStat?.isDirectory() && await exists(manifestPath)) {
  const manifest = await readFile(manifestPath, 'utf8')
  const schemaVersion = Number(scalar(manifest, 'schemaVersion'))
  if (schemaVersion !== 1) report('error', 'schema-version', manifestPath, `Expected schemaVersion 1, received ${Number.isFinite(schemaVersion) ? schemaVersion : 'missing/invalid'}`)

  const configuredContent = scalar(sectionBlock(manifest, 'content'), 'root')
  const configuredAssets = scalar(sectionBlock(manifest, 'assets'), 'root')
  if (configuredContent) contentRoot = configuredContent
  if (configuredAssets) assetsRoot = configuredAssets
  if (!safeWorkspacePath(contentRoot)) report('error', 'content-root', manifestPath, `Unsafe content.root: ${contentRoot}`)
  if (!safeWorkspacePath(assetsRoot)) report('error', 'assets-root', manifestPath, `Unsafe assets.root: ${assetsRoot}`)

  if (/^\s*(?:token|password|secret|apiKey|privateKey)\s*:/im.test(manifest)) {
    report('error', 'secret-in-manifest', manifestPath, 'Secrets and credentials must not be stored in tensornote.yaml')
  }

  for (const declared of environmentFiles(manifest)) {
    if (!safeWorkspacePath(declared)) report('error', 'environment-path', manifestPath, `Unsafe environment file path: ${declared}`)
    else if (!await exists(join(root, declared))) report('warning', 'environment-missing', manifestPath, `Declared environment file does not exist: ${declared}`)
  }
} else if (rootStat?.isDirectory()) {
  report('warning', 'manifest-missing', manifestPath, 'No tensornote.yaml found; TensorNote will use safe defaults and disable execution')
}

const contentDirectory = join(root, contentRoot)
const assetDirectory = join(root, assetsRoot)
if (rootStat?.isDirectory() && !await exists(contentDirectory)) report('error', 'content-missing', contentDirectory, `Content root does not exist: ${contentRoot}`)
if (rootStat?.isDirectory() && !await exists(assetDirectory)) report('warning', 'assets-missing', assetDirectory, `Assets root does not exist: ${assetsRoot}`)

const markdownFiles = (await filesBelow(contentDirectory)).filter((path) => extname(path).toLowerCase() === '.md')
if (rootStat?.isDirectory() && !markdownFiles.length) report('warning', 'notes-empty', contentDirectory, 'No Markdown notes found below the content root')

const documents = []
const ids = new Map()
for (const path of markdownFiles) {
  const source = await readFile(path, 'utf8')
  const parsed = frontmatter(source)
  if (!parsed) {
    report('warning', 'frontmatter-missing', path, 'Agent-authored notes should start with YAML Frontmatter')
    documents.push({ path, source, body: source, id: null, title: null })
    continue
  }

  const id = yamlField(parsed.yaml, 'id')
  const title = yamlField(parsed.yaml, 'title')
  const required = ['id', 'title', 'section', 'order', 'tags', 'prerequisites', 'summary']
  for (const key of required) {
    if (!new RegExp(`^${key}:`, 'm').test(parsed.yaml)) report('warning', 'frontmatter-field', path, `Missing recommended Frontmatter field: ${key}`)
  }
  if (id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) report('warning', 'id-format', path, `Note id should use lowercase kebab-case: ${id}`)
  if (id) {
    if (ids.has(id)) report('error', 'id-duplicate', path, `Duplicate note id "${id}" also used by ${relative(root, ids.get(id))}`)
    else ids.set(id, path)
  }

  const firstH1 = parsed.body.match(/^#\s+(.+)$/m)?.[1]?.trim()
  if (title && firstH1 !== title) report('warning', 'title-h1', path, `First H1 should exactly match title "${title}"`)
  documents.push({ path, source, body: parsed.body, id, title })
}

const resolvableNotes = new Set()
for (const document of documents) {
  if (document.id) resolvableNotes.add(document.id.toLowerCase())
  if (document.title) resolvableNotes.add(document.title.toLowerCase())
  resolvableNotes.add(document.path.split(sep).at(-1).replace(/\.md$/i, '').toLowerCase())
  resolvableNotes.add(relative(contentDirectory, document.path).replace(/\.md$/i, '').split(sep).join('/').toLowerCase())
}

for (const document of documents) {
  const prose = document.body.replace(/```[\s\S]*?```/g, '')
  for (const match of prose.matchAll(/!?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)) {
    const target = match[1].trim().replace(/\.md$/i, '').toLowerCase()
    if (target && !resolvableNotes.has(target)) report('warning', 'wikilink-unresolved', document.path, `Unresolved WikiLink target: ${match[1].trim()}`)
  }

  for (const match of prose.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g)) {
    const target = decodeURIComponent(match[1])
    if (/^(?:https?:|data:|#)/i.test(target)) continue
    const resolved = resolve(dirname(document.path), target)
    if (!await exists(resolved)) report('warning', 'asset-unresolved', document.path, `Missing local image: ${target}`)
  }

  const labs = new Map()
  for (const match of document.body.matchAll(/```python\s+exec([^\n]*)\n[\s\S]*?```/g)) {
    const meta = match[1]
    const attributes = Object.fromEntries([...meta.matchAll(/(lab|cell|title|difficulty)="([^"]+)"/g)].map((item) => [item[1], item[2]]))
    for (const key of ['lab', 'cell', 'title', 'difficulty']) {
      if (!attributes[key]) report(key === 'difficulty' ? 'info' : 'warning', 'lab-metadata', document.path, `Executable fence is missing ${key} metadata${key === 'difficulty' ? '; TensorNote will use the backward-compatible basic default' : ''}`)
    }
    if (attributes.lab && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(attributes.lab)) report('warning', 'lab-id', document.path, `Lab id should use lowercase kebab-case: ${attributes.lab}`)
    const cell = Number(attributes.cell)
    if (attributes.cell && (!Number.isInteger(cell) || cell < 1)) report('error', 'lab-cell', document.path, `Cell must be a positive integer: ${attributes.cell}`)
    if (attributes.difficulty && !['basic', 'medium', 'heavy'].includes(attributes.difficulty)) report('error', 'lab-difficulty', document.path, `Unsupported difficulty: ${attributes.difficulty}`)
    if (attributes.lab && Number.isInteger(cell) && cell > 0) {
      const cells = labs.get(attributes.lab) ?? []
      if (cells.includes(cell)) report('error', 'lab-cell-duplicate', document.path, `Duplicate ${attributes.lab} cell ${cell}`)
      labs.set(attributes.lab, [...cells, cell])
    }
  }
  for (const [lab, cells] of labs) {
    const sorted = [...cells].sort((a, b) => a - b)
    if (sorted.some((cell, index) => cell !== index + 1)) report('warning', 'lab-cell-gap', document.path, `Lab ${lab} cells should be sequential from 1; found ${sorted.join(', ')}`)
  }
}

const errors = findings.filter((finding) => finding.severity === 'error').length
const warnings = findings.filter((finding) => finding.severity === 'warning').length
const infos = findings.filter((finding) => finding.severity === 'info').length
const result = { workspace: root, notes: markdownFiles.length, errors, warnings, infos, strict, findings }

if (json) console.log(JSON.stringify(result, null, 2))
else {
  for (const finding of findings) console.log(`${finding.severity.toUpperCase()} [${finding.code}] ${finding.file}: ${finding.message}`)
  console.log(`TensorNote workspace validation: ${markdownFiles.length} notes, ${errors} errors, ${warnings} warnings, ${infos} info${strict ? ' (strict)' : ''}`)
}

process.exitCode = errors > 0 || strict && warnings > 0 ? 1 : 0
