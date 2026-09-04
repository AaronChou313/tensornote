#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { access, readFile, readdir, stat } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { parse } from 'yaml'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const workspaceValidator = resolve(scriptDirectory, '../skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs')
const ignoredDirectories = new Set(['.git', '.venv', 'node_modules', 'dist', '.cache', '__pycache__'])
const licenseNames = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING', 'COPYING.md', 'COPYING.txt']
const repositorySegment = /^[a-z0-9_.-]+$/i
const fullRevision = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i
const maximumRepositorySegmentLength = 100

async function exists(path) {
  try { await access(path); return true } catch { return false }
}

function safeRelativePath(value) {
  return typeof value === 'string' && Boolean(value) && !value.startsWith('/') && !value.startsWith('\\') && !value.split(/[\\/]+/).includes('..')
}

function validRepositorySegment(value) {
  return typeof value === 'string' && value.length <= maximumRepositorySegmentLength && value !== '.' && value !== '..' && repositorySegment.test(value)
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

export async function validatePublication({ workspace, owner, repo, revision }) {
  const root = resolve(workspace)
  const findings = []
  const add = (code, message, file = '.') => findings.push({ code, message, file })
  const rootInfo = await stat(root).catch(() => null)
  if (!rootInfo?.isDirectory()) return { ok: false, workspace: root, findings: [{ code: 'workspace-root', file: '.', message: 'Workspace root does not exist or is not a directory' }] }

  if (!validRepositorySegment(owner) || !validRepositorySegment(repo)) add('repository', 'GitHub owner and repository must use a bounded repository slug')
  if (!fullRevision.test(revision ?? '')) add('revision', 'Publication must be pinned to a complete Git commit revision')

  const workspaceCheck = spawnSync(process.execPath, [workspaceValidator, root, '--strict'], { encoding: 'utf8' })
  if (workspaceCheck.status !== 0) add('workspace-validation', (workspaceCheck.stdout || workspaceCheck.stderr || 'Workspace validation failed').trim())

  const manifestPath = join(root, 'tensornote.yaml')
  let manifest = {}
  try { manifest = parse(await readFile(manifestPath, 'utf8')) ?? {} } catch (reason) { add('manifest', reason instanceof Error ? reason.message : 'Cannot parse tensornote.yaml', 'tensornote.yaml') }
  const publishing = manifest && typeof manifest.publishing === 'object' && !Array.isArray(manifest.publishing) ? manifest.publishing : {}
  const content = manifest && typeof manifest.content === 'object' && !Array.isArray(manifest.content) ? manifest.content : {}
  const environment = manifest && typeof manifest.environment === 'object' && !Array.isArray(manifest.environment) ? manifest.environment : {}
  const contentRoot = safeRelativePath(content.root) ? content.root : 'notes'

  if (typeof publishing.title !== 'string' || !publishing.title.trim()) add('publishing-title', 'publishing.title is required for a public knowledge product', 'tensornote.yaml')
  if (typeof publishing.description !== 'string' || !publishing.description.trim()) add('publishing-description', 'publishing.description is required for a public knowledge product', 'tensornote.yaml')
  if (typeof publishing.defaultNote !== 'string' || !publishing.defaultNote.trim()) add('publishing-default-note', 'publishing.defaultNote must name the initial note ID', 'tensornote.yaml')
  if (publishing.accent !== undefined && (typeof publishing.accent !== 'string' || !/^#[0-9a-f]{6}$/i.test(publishing.accent))) add('publishing-accent', 'publishing.accent must be a six-digit hex color', 'tensornote.yaml')
  if (publishing.logo !== undefined) {
    if (!safeRelativePath(publishing.logo)) add('publishing-logo', 'publishing.logo must be a safe Workspace-relative path', 'tensornote.yaml')
    else if (!await exists(join(root, publishing.logo))) add('publishing-logo', `Publishing logo does not exist: ${publishing.logo}`, 'tensornote.yaml')
  }

  const markdown = (await filesBelow(join(root, contentRoot))).filter((path) => extname(path).toLowerCase() === '.md')
  const ids = new Set()
  for (const path of markdown) {
    try {
      const id = matter(await readFile(path, 'utf8')).data.id
      if (typeof id === 'string') ids.add(id)
    } catch { /* The strict Workspace validator reports malformed notes. */ }
  }
  if (typeof publishing.defaultNote === 'string' && !ids.has(publishing.defaultNote)) add('publishing-default-note', `Initial note ID does not exist: ${publishing.defaultNote}`, 'tensornote.yaml')

  const declaredEnvironment = Array.isArray(environment.files) ? environment.files : []
  for (const path of declaredEnvironment) {
    if (!safeRelativePath(path) || !await exists(join(root, path))) add('environment', `Declared environment file is missing or unsafe: ${path}`, 'tensornote.yaml')
  }

  const license = (await Promise.all(licenseNames.map(async (name) => await exists(join(root, name)) ? name : null))).find(Boolean)
  if (!license) add('license', 'A root LICENSE or COPYING file is required before public deployment')
  else if (!(await readFile(join(root, license), 'utf8')).trim()) add('license', `${license} is empty`, license)

  for (const path of await filesBelow(root)) {
    const name = basename(path).toLowerCase()
    const safeEnvironmentConfig = name === '.env.example' || name === '.env.desktop' || name === '.env.static'
    const unsafe = name === '.env' || name.startsWith('.env.') && !safeEnvironmentConfig || name === '.npmrc' || name === '.pypirc'
      || name === 'id_rsa' || name === 'id_ed25519' || name.endsWith('.pem') || name.endsWith('.key')
    if (unsafe) add('secret-file', `Potential credential file must not be published: ${relative(root, path)}`, relative(root, path))
  }

  return { ok: findings.length === 0, workspace: root, owner, repo, revision, notes: markdown.length, license: license ?? null, findings }
}

function parseArguments(argv) {
  const value = (name) => argv[argv.indexOf(name) + 1]
  return {
    workspace: value('--workspace') || process.env.TENSORNOTE_WORKSPACE || '.',
    owner: value('--owner') || process.env.TENSORNOTE_PUBLISH_OWNER,
    repo: value('--repo') || process.env.TENSORNOTE_PUBLISH_REPO,
    revision: value('--revision') || process.env.TENSORNOTE_PUBLISH_REVISION,
    json: argv.includes('--json'),
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { json, ...options } = parseArguments(process.argv.slice(2))
  const result = await validatePublication(options)
  if (json) console.log(JSON.stringify(result, null, 2))
  else if (result.ok) console.log(`TensorNote publication validation: PASS · ${result.notes} notes · ${result.license} · ${result.owner}/${result.repo}@${result.revision.slice(0, 8)}`)
  else {
    for (const finding of result.findings) console.error(`ERROR [${finding.code}] ${finding.file}: ${finding.message}`)
    console.error(`TensorNote publication validation: FAIL · ${result.findings.length} issue(s)`)
  }
  process.exitCode = result.ok ? 0 : 1
}
