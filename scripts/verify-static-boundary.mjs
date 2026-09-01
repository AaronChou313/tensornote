import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const outputRoot = fileURLToPath(new URL('../dist', import.meta.url))
const forbidden = [
  '__TAURI_INTERNALS__',
  'platform_info',
  'select_native_workspace',
  'native_workspace_',
  'native_git_',
  'reveal_native_workspace',
  'take_pending_native_workspace',
  'native-workspace-open',
  'local_runtime_',
]

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesIn(path) : [path]
  }))
  return nested.flat()
}

const violations = []
for (const file of await filesIn(outputRoot)) {
  if (!['.html', '.js'].includes(extname(file))) continue
  const source = await readFile(file, 'utf8')
  for (const token of forbidden) {
    if (source.includes(token)) violations.push(`${relative(outputRoot, file)} contains ${token}`)
  }
}

if (violations.length) {
  console.error('Static Web boundary violation:')
  console.error(violations.map((violation) => `- ${violation}`).join('\n'))
  process.exitCode = 1
} else {
  console.log('Static Web boundary verified: no Tauri IPC surface was bundled.')
}
