#!/usr/bin/env node
import { lstat, readFile, readdir, realpath } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDocument } from 'yaml'

const ignoredDirectories = new Set(['.git', '.venv', 'node_modules', 'dist', '.cache', '__pycache__'])
const object = (value) => value && typeof value === 'object' && !Array.isArray(value)
const slug = (value) => value.trim().toLowerCase().replace(/[\s/]+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '')
const portable = (value) => typeof value === 'string' && !/^(?:[a-z]+:|[\\/])/i.test(value) && !value.split(/[\\/]/).includes('..') && !value.includes('\0')
const inside = (root, path) => { const rel = relative(root, path); return rel !== '..' && !rel.startsWith(`..${sep}`) && !/^(?:[a-z]:|[\\/])/i.test(rel) }
const kebab = (value) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
function hasCycle(ids, dependencies) {
  const visiting = new Set(), visited = new Set()
  const visit = (id) => {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    for (const dependency of dependencies(id)) if (ids.has(dependency) && visit(dependency)) return true
    visiting.delete(id); visited.add(id)
    return false
  }
  return [...ids].some(visit)
}
function proseOnly(source) {
  // Preserve line breaks so heading order stays aligned while ignoring fenced examples.
  let fence = null
  return source.split('\n').map((line) => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (!fence && marker) { fence = marker[1]; return '' }
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null
      return ''
    }
    return line
  }).join('\n')
}

export async function validateWorkspace(rootArg, { strict = false } = {}) {
  const root = resolve(rootArg)
  const findings = []
  const documents = []
  let schemaVersion = null
  let readOnly = false
  const report = (severity, code, file, message) => findings.push({ severity, code, file: file ? relative(root, file).split(sep).join('/') || '.' : '.', message })
  const result = () => {
    const errors = findings.filter((f) => f.severity === 'error').length
    const warnings = findings.filter((f) => f.severity === 'warning').length
    const infos = findings.filter((f) => f.severity === 'info').length
    return { formatVersion: 1, ok: errors === 0 && (!strict || warnings === 0), workspace: root, notes: documents.length, schemaVersion, readOnly, errors, warnings, infos, strict, findings }
  }
  const status = async (path) => { try { return await lstat(path) } catch (error) { if (error.code === 'ENOENT') return null; throw error } }
  try {
    const canonicalRoot = await realpath(root).catch(() => null)
    if (!canonicalRoot || !(await status(canonicalRoot))?.isDirectory()) {
      report('error', 'workspace-root', root, 'Workspace root does not exist or is not a directory')
      return result()
    }
    // Never follow a manifest, content root, asset or ancestor symlink outside this workspace.
    const safeExisting = async (path) => {
      if (!inside(root, path)) return false
      let cursor = root
      for (const part of relative(root, path).split(sep).filter(Boolean)) {
        cursor = join(cursor, part)
        const info = await status(cursor)
        if (!info) return false
        if (info.isSymbolicLink()) { report('error', 'symlink', cursor, 'Symbolic links are not portable workspace entries'); return false }
      }
      return inside(canonicalRoot, await realpath(path))
    }
    const yaml = (source, path) => {
      const parsed = parseDocument(source, { uniqueKeys: true })
      if (parsed.errors.length) {
        report('error', 'yaml-invalid', path, 'Invalid YAML or duplicate mapping keys; inspect the source file')
        return null
      }
      try {
        const data = parsed.toJS({ maxAliasCount: 100 })
        if (!object(data)) { report('error', 'yaml-object', path, 'Expected a YAML mapping'); return null }
        return data
      } catch { report('error', 'yaml-invalid', path, 'YAML aliases exceed the supported limit'); return null }
    }
    const checkSecrets = (data, path, seen = new Set()) => {
      if (!data || typeof data !== 'object' || seen.has(data)) return
      seen.add(data)
      for (const [key, value] of Object.entries(data)) {
        if (/^(?:token|password|secret|api[-_]?key|private[-_]?key|cookie)$/i.test(key)) report('error', 'secret-field', path, 'Credential fields must be stored outside workspace content')
        checkSecrets(value, path, seen)
      }
    }
    const manifestPath = join(root, 'tensornote.yaml')
    let manifest = {}
    if (await status(manifestPath)) {
      if (!await safeExisting(manifestPath)) return result()
      manifest = yaml(await readFile(manifestPath, 'utf8'), manifestPath)
      if (!manifest) return result()
      schemaVersion = typeof manifest.schemaVersion === 'number' && Number.isFinite(manifest.schemaVersion) ? manifest.schemaVersion : null
      if (manifest.schemaVersion !== 1) {
        readOnly = Number(manifest.schemaVersion) > 1
        report('error', 'schema-version', manifestPath, readOnly ? 'Future schema: inspect only; do not rewrite or execute this workspace' : 'Agent-authored workspaces must declare numeric schemaVersion: 1')
      }
      checkSecrets(manifest, manifestPath)
    } else report('warning', 'manifest-missing', manifestPath, 'No manifest; runtime safe defaults disable execution')
    const contentRoot = manifest.content?.root ?? 'notes'
    const assetsRoot = manifest.assets?.root ?? 'assets'
    let unsafeRoot = false
    for (const [key, value] of [['content', contentRoot], ['assets', assetsRoot]]) {
      if (!portable(value)) { report('error', `${key}-root`, manifestPath, `${key}.root must be a workspace-relative path without parent traversal`); unsafeRoot = true }
    }
    if (unsafeRoot) return result()
    const envFiles = manifest.environment?.files ?? []
    if (!Array.isArray(envFiles)) report('error', 'environment-files', manifestPath, 'environment.files must be an array')
    else for (const entry of envFiles) {
      if (!portable(entry) || !entry) report('error', 'environment-path', manifestPath, 'Environment entries must be nonempty workspace-relative paths')
      else if (!await safeExisting(resolve(root, entry))) report('warning', 'environment-missing', manifestPath, 'A declared environment file is missing or unsafe')
    }
    if (manifest.features?.executable !== undefined && typeof manifest.features.executable !== 'boolean') report('error', 'execution-flag', manifestPath, 'features.executable must be a boolean')
    const contentDirectory = resolve(root, contentRoot)
    const assetDirectory = resolve(root, assetsRoot)
    if (!await safeExisting(contentDirectory) || !(await status(contentDirectory))?.isDirectory()) { report('error', 'content-missing', manifestPath, 'Content root is missing or unsafe'); return result() }
    if (!await safeExisting(assetDirectory)) report('warning', 'assets-missing', manifestPath, 'Assets root is missing or unsafe')
    const walk = async (directory) => {
      const paths = []
      for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
        if (ignoredDirectories.has(entry.name)) continue
        const path = join(directory, entry.name)
        if (entry.isSymbolicLink()) report('error', 'symlink', path, 'Symbolic links are not portable workspace entries')
        else if (entry.isDirectory()) paths.push(...await walk(path))
        else if (entry.isFile() && extname(path).toLowerCase() === '.md') paths.push(path)
      }
      return paths
    }
    const ids = new Map()
    for (const path of await walk(contentDirectory)) {
      const source = await readFile(path, 'utf8')
      const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
      let fields = {}, body = source
      if (match) {
        fields = yaml(match[1], path) ?? {}
        body = source.slice(match[0].length)
        checkSecrets(fields, path)
        for (const key of ['id', 'title', 'section', 'order', 'tags', 'prerequisites', 'summary']) {
          if (!(key in fields)) report('warning', 'frontmatter-field', path, `Missing recommended Frontmatter field: ${key}`)
        }
        for (const key of ['id', 'title', 'section', 'summary']) {
          if (key in fields && (typeof fields[key] !== 'string' || !fields[key].trim())) report('error', 'frontmatter-type', path, `${key} must be a nonempty string`)
        }
        if ('order' in fields && (typeof fields.order !== 'number' || !Number.isFinite(fields.order))) report('error', 'frontmatter-type', path, 'order must be a finite number')
        for (const key of ['tags', 'prerequisites', 'aliases']) {
          if (key in fields && (!Array.isArray(fields[key]) || fields[key].some((v) => typeof v !== 'string' || !v.trim()))) report('warning', 'frontmatter-type', path, `${key} should be an array of nonempty strings`)
        }
      } else report('warning', 'frontmatter-missing', path, 'Agent-authored notes should start with YAML Frontmatter')
      const id = typeof fields.id === 'string' ? fields.id : null
      const title = typeof fields.title === 'string' ? fields.title : null
      if (id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) report('warning', 'id-format', path, 'Note id should use lowercase kebab-case')
      if (id && ids.has(id)) report('error', 'id-duplicate', path, `Duplicate ID also used by ${relative(root, ids.get(id))}`)
      else if (id) ids.set(id, path)
      const prose = proseOnly(body)
      const firstH1 = prose.match(/^#\s+(.+)$/m)?.[1]?.replace(/\s+#+\s*$/, '').trim()
      if (title && firstH1 !== title) report('warning', 'title-h1', path, 'First H1 should match Frontmatter title')
      const counts = new Map()
      const headings = [...prose.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => {
        const text = m[1].replace(/\s+#+\s*$/, '').trim(), base = slug(text), count = counts.get(base) ?? 0
        counts.set(base, count + 1)
        return { text, id: count ? `${base}-${count}` : base }
      })
      documents.push({ path, body, prose, id, title, fields, headings })
    }
    if (!documents.length) report('warning', 'notes-empty', contentDirectory, 'No Markdown notes found')
    const targets = new Map()
    for (const doc of documents) {
      const aliases = Array.isArray(doc.fields.aliases) ? doc.fields.aliases.filter((v) => typeof v === 'string') : []
      for (const label of [doc.id, doc.title, ...aliases, doc.path.split(sep).at(-1).replace(/\.md$/i, ''), relative(contentDirectory, doc.path).split(sep).join('/').replace(/\.md$/i, '')].filter(Boolean)) {
        const key = label.toLowerCase()
        targets.set(key, [...new Set([...(targets.get(key) ?? []), doc])])
      }
    }
    const headingExists = (doc, heading) => doc.headings.some((h) => h.text.toLowerCase() === heading.toLowerCase() || h.id === slug(heading))
    for (const doc of documents) {
      for (const id of Array.isArray(doc.fields.prerequisites) ? doc.fields.prerequisites : []) if (!ids.has(id)) report('warning', 'prerequisite-unresolved', doc.path, 'A prerequisite does not resolve to an existing note ID')
      for (const match of doc.prose.matchAll(/!?\[\[([^\]|]*)(?:\|[^\]]*)?\]\]/g)) {
        const [name, heading] = match[1].split('#')
        const candidates = name.trim() ? targets.get(name.trim().replace(/\.md$/i, '').toLowerCase()) ?? [] : [doc]
        if (!candidates.length) report('warning', 'wikilink-unresolved', doc.path, 'A WikiLink target does not resolve')
        else if (candidates.length > 1) report('warning', 'wikilink-ambiguous', doc.path, 'A WikiLink matches multiple notes; prefer a stable ID or explicit path')
        else if (heading && !headingExists(candidates[0], heading)) report('warning', 'heading-unresolved', doc.path, 'A WikiLink heading does not resolve')
      }
      for (const match of doc.prose.matchAll(/(!?)\[[^\]]*\]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g)) {
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(match[2])) continue
        let target
        try { target = decodeURIComponent(match[2]) } catch { report('warning', 'link-encoding', doc.path, 'A local Markdown link contains invalid percent encoding'); continue }
        const [pathPart, heading] = target.split('#')
        if (!pathPart) {
          if (heading && !headingExists(doc, heading)) report('warning', 'heading-unresolved', doc.path, 'A local heading does not resolve')
          continue
        }
        const resolved = resolve(dirname(doc.path), pathPart)
        if (!inside(root, resolved)) { report('error', 'link-outside-workspace', doc.path, 'A local Markdown link escapes the workspace'); continue }
        if (!await safeExisting(resolved)) report('warning', match[1] ? 'asset-unresolved' : 'link-unresolved', doc.path, 'A local Markdown link or asset is missing or unsafe')
        else if (heading) {
          const linked = documents.find((note) => note.path === resolved)
          if (linked && !headingExists(linked, heading)) report('warning', 'heading-unresolved', doc.path, 'A Markdown heading link does not resolve')
        }
      }
      const labs = new Map()
      for (const match of doc.body.matchAll(/```python\s+exec([^\n]*)\n[\s\S]*?```/g)) {
        const attributes = Object.fromEntries([...match[1].matchAll(/(lab|cell|title|difficulty)="([^"]+)"/g)].map((item) => [item[1], item[2]]))
        for (const key of ['lab', 'cell', 'title', 'difficulty']) if (!attributes[key]) report(key === 'difficulty' ? 'info' : 'warning', 'lab-metadata', doc.path, `Executable fence is missing ${key} metadata`)
        if (attributes.lab && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(attributes.lab)) report('warning', 'lab-id', doc.path, 'Lab id should use lowercase kebab-case')
        const cell = Number(attributes.cell)
        if (attributes.cell && (!Number.isInteger(cell) || cell < 1)) report('error', 'lab-cell', doc.path, 'Cell must be a positive integer')
        if (attributes.difficulty && !['basic', 'medium', 'heavy'].includes(attributes.difficulty)) report('error', 'lab-difficulty', doc.path, 'Unsupported Lab difficulty')
        if (attributes.lab && Number.isInteger(cell) && cell > 0) {
          const cells = labs.get(attributes.lab) ?? []
          if (cells.includes(cell)) report('error', 'lab-cell-duplicate', doc.path, 'A Lab contains duplicate cell numbers')
          labs.set(attributes.lab, [...cells, cell])
        }
      }
      for (const cells of labs.values()) if ([...cells].sort((a, b) => a - b).some((cell, i) => cell !== i + 1)) report('warning', 'lab-cell-gap', doc.path, 'Lab cells should be sequential from 1')
      for (const match of doc.body.matchAll(/```tensornote-experiment\s*\n([\s\S]*?)```/g)) {
        const reference = yaml(match[1], doc.path)
        if (!reference) continue
        if (!portable(reference.manifest) || !reference.manifest) {
          report('error', 'experiment-reference-path', doc.path, 'Experiment manifest must be a nonempty safe relative path')
          continue
        }
        const experimentPath = resolve(dirname(doc.path), reference.manifest)
        if (!inside(root, experimentPath) || !await safeExisting(experimentPath)) {
          report('error', 'experiment-manifest-missing', doc.path, 'Referenced Experiment Manifest is missing or unsafe')
          continue
        }
        const experiment = yaml(await readFile(experimentPath, 'utf8'), experimentPath)
        if (!experiment) continue
        checkSecrets(experiment, experimentPath)
        if (experiment.schemaVersion !== 1) report('error', 'experiment-schema-version', experimentPath, Number(experiment.schemaVersion) > 1 ? 'Future Experiment Manifest is read-only and cannot be released as an executable v1 experiment' : 'Experiment Manifest must declare schemaVersion: 1')
        if (!kebab(experiment.experiment?.id ?? '')) report('error', 'experiment-id', experimentPath, 'experiment.id must use lowercase kebab-case')
        if (!portable(experiment.experiment?.workingDirectory)) report('error', 'experiment-working-directory', experimentPath, 'experiment.workingDirectory must be a safe relative path')
        const environments = object(experiment.environments) ? experiment.environments : {}
        const presets = object(experiment.presets) ? experiment.presets : {}
        const steps = object(experiment.steps) ? experiment.steps : {}
        const parameters = object(experiment.parameters) ? experiment.parameters : {}
        if (!Object.keys(environments).length) report('error', 'experiment-environments', experimentPath, 'Experiment must declare at least one environment')
        if (!Object.keys(presets).length) report('error', 'experiment-presets', experimentPath, 'Experiment must declare at least one preset')
        if (!Object.keys(steps).length) report('error', 'experiment-steps', experimentPath, 'Experiment must declare at least one step')
        if (!presets[experiment.defaultPreset]) report('error', 'experiment-default-preset', experimentPath, 'defaultPreset must reference an existing preset')
        if (reference.preset && !presets[reference.preset]) report('error', 'experiment-reference-preset', doc.path, 'Experiment reference preset does not exist')
        const base = dirname(experimentPath)
        for (const [id, environment] of Object.entries(environments)) {
          if (!kebab(id) || !object(environment)) report('error', 'experiment-environment', experimentPath, 'Environment IDs must use lowercase kebab-case and map to objects')
          if (environment?.extends && !environments[environment.extends]) report('error', 'experiment-environment-parent', experimentPath, 'Environment extends must reference an existing environment')
          for (const file of Array.isArray(environment?.files) ? environment.files : []) {
            const target = resolve(base, file)
            if (!portable(file) || !inside(root, target) || !await safeExisting(target)) report('error', 'experiment-environment-file', experimentPath, 'Environment dependency file is missing or unsafe')
          }
        }
        if (hasCycle(new Set(Object.keys(environments)), (id) => environments[id]?.extends ? [environments[id].extends] : [])) report('error', 'experiment-environment-cycle', experimentPath, 'Environment inheritance must be acyclic')
        for (const [id, preset] of Object.entries(presets)) {
          if (!kebab(id) || !object(preset)) { report('error', 'experiment-preset', experimentPath, 'Preset IDs must use lowercase kebab-case and map to objects'); continue }
          if (!environments[preset.environment]) report('error', 'experiment-preset-environment', experimentPath, `Preset ${id} references an unknown environment`)
          if (!Array.isArray(preset.steps) || !preset.steps.length) report('error', 'experiment-preset-steps', experimentPath, `Preset ${id} must contain at least one step`)
          else for (const stepId of preset.steps) if (!steps[stepId]) report('error', 'experiment-preset-step', experimentPath, `Preset ${id} references an unknown step`)
          if (preset.parameters !== undefined && !object(preset.parameters)) report('error', 'experiment-preset-parameters', experimentPath, `Preset ${id} parameters must be a mapping`)
          else for (const parameterId of Object.keys(preset.parameters ?? {})) if (!parameters[parameterId]) report('error', 'experiment-preset-parameter', experimentPath, `Preset ${id} overrides an unknown parameter`)
        }
        for (const [id, step] of Object.entries(steps)) {
          if (!kebab(id) || !object(step)) report('error', 'experiment-step', experimentPath, 'Step IDs must use lowercase kebab-case and map to objects')
          if (!['python', 'python-module', 'notebook', 'torchrun'].includes(step?.runner)) report('error', 'experiment-runner', experimentPath, 'Unsupported Experiment runner')
          if (step?.runner === 'torchrun' && (!Number.isInteger(step.processes) || step.processes < 1 || step.processes > 64)) report('error', 'experiment-torchrun-processes', experimentPath, 'torchrun processes must be an integer from 1 to 64')
          if (step?.nodes !== undefined && (!Number.isInteger(step.nodes) || step.nodes < 1 || step.nodes > 64)) report('error', 'experiment-torchrun-nodes', experimentPath, 'torchrun nodes must be an integer from 1 to 64')
          if (step?.nodeRank !== undefined && (!Number.isInteger(step.nodeRank) || step.nodeRank < 0)) report('error', 'experiment-torchrun-rank', experimentPath, 'torchrun nodeRank must be a nonnegative integer')
          if (step?.masterPort !== undefined && (!Number.isInteger(step.masterPort) || step.masterPort < 1024 || step.masterPort > 65535)) report('error', 'experiment-torchrun-port', experimentPath, 'torchrun masterPort must be 1024–65535')
          if (step?.args !== undefined && (!Array.isArray(step.args) || step.args.some((arg) => typeof arg !== 'string'))) report('error', 'experiment-step-args', experimentPath, 'Step args must be an array of strings')
          for (const dependency of Array.isArray(step?.dependsOn) ? step.dependsOn : []) if (!steps[dependency]) report('error', 'experiment-step-dependency', experimentPath, 'Step dependency does not exist')
          if (step?.file) {
            const target = resolve(base, experiment.experiment?.workingDirectory ?? '.', step.file)
            if (!portable(step.file) || !inside(root, target) || !await safeExisting(target)) report('error', 'experiment-step-file', experimentPath, 'Step file is missing or unsafe')
          }
          for (const output of Array.isArray(step?.outputs) ? step.outputs : []) if (!portable(output) || !output) report('error', 'experiment-step-output', experimentPath, 'Step outputs must be safe relative paths')
        }
        if (hasCycle(new Set(Object.keys(steps)), (id) => Array.isArray(steps[id]?.dependsOn) ? steps[id].dependsOn : [])) report('error', 'experiment-step-cycle', experimentPath, 'Step dependencies must be acyclic')
        for (const [id, artifact] of Object.entries(object(experiment.artifacts) ? experiment.artifacts : {})) {
          if (!kebab(id) || !object(artifact)) report('error', 'experiment-artifact', experimentPath, 'Artifact IDs must use lowercase kebab-case and map to objects')
          if (!portable(artifact?.path) || !artifact.path) report('error', 'experiment-artifact-path', experimentPath, 'Artifact paths must be safe relative paths')
          if (!['file', 'directory', 'image', 'json', 'csv', 'markdown', 'notebook', 'model'].includes(artifact?.kind)) report('error', 'experiment-artifact-kind', experimentPath, 'Artifact kind is unsupported')
        }
        for (const [id, download] of Object.entries(object(experiment.downloads) ? experiment.downloads : {})) {
          if (!kebab(id) || !object(download)) report('error', 'experiment-download', experimentPath, 'Download IDs must use lowercase kebab-case and map to objects')
          let source
          try { source = new URL(download?.url ?? '') } catch {}
          if (!source || source.protocol !== 'https:' || source.username || source.password) report('error', 'experiment-download-url', experimentPath, 'Download sources must be credential-free HTTPS URLs')
          if (!portable(download?.cache) || !download.cache) report('error', 'experiment-download-cache', experimentPath, 'Download cache must be a safe relative path')
          if (download?.sha256 !== undefined && !/^[a-f0-9]{64}$/i.test(download.sha256)) report('error', 'experiment-download-sha256', experimentPath, 'Download sha256 must contain 64 hexadecimal characters')
        }
      }
    }
  } catch {
    report('error', 'workspace-io', root, 'Unable to read workspace entries; check filesystem permissions and retry')
  }
  return result()
}

if (process.argv[1] && await realpath(resolve(process.argv[1])).catch(() => '') === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2)
  const json = argv.includes('--json'), strict = argv.includes('--strict')
  const roots = argv.filter((arg) => !arg.startsWith('--'))
  if (roots.length !== 1 || argv.some((arg) => arg.startsWith('--') && !['--json', '--strict'].includes(arg))) {
    const message = 'Usage: validate-workspace.mjs <workspace-root> [--strict] [--json]'
    console.log(json ? JSON.stringify({ formatVersion: 1, ok: false, usageError: message }) : message)
    process.exitCode = 2
  } else {
    const result = await validateWorkspace(roots[0], { strict })
    if (json) console.log(JSON.stringify(result, null, 2))
    else {
      for (const f of result.findings) console.log(`${f.severity.toUpperCase()} [${f.code}] ${f.file}: ${f.message}`)
      console.log(`TensorNote workspace validation: ${result.notes} notes, ${result.errors} errors, ${result.warnings} warnings, ${result.infos} info${strict ? ' (strict)' : ''}`)
    }
    process.exitCode = result.ok ? 0 : 1
  }
}
