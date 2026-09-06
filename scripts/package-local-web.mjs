#!/usr/bin/env node
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const version = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version
const output = resolve(process.argv.slice(2).find((arg) => arg !== '--') || join(root, '.release'))
const staging = await mkdtemp(join(tmpdir(), 'tensornote-local-web-'))
try {
  const target = join(staging, 'TensorNote-local-web')
  await mkdir(join(target, 'scripts'), { recursive: true })
  await cp(join(root, 'dist'), join(target, 'app'), { recursive: true })
  await cp(join(root, 'scripts/local-web-server.mjs'), join(target, 'start.mjs'))
  for (const file of ['git-bridge.mjs', 'git-bridge-lib.mjs']) await cp(join(root, 'scripts', file), join(target, 'scripts', file))
  await writeFile(join(target, 'package.json'), JSON.stringify({ name: 'tensornote-local-web', version, private: true, type: 'module', engines: { node: '>=22' } }, null, 2) + '\n')
  for (const file of ['LICENSE', 'docs/zh-CN/USER_GUIDE.md', 'docs/en/USER_GUIDE.md']) await cp(join(root, file), join(target, file === 'LICENSE' ? 'LICENSE' : file.includes('zh-CN') ? '使用说明.md' : 'USER_GUIDE.md'))
  await mkdir(output, { recursive: true })
  const archive = join(output, `TensorNote-local-web-${version}.tar.gz`)
  execFileSync('tar', ['-czf', archive, '-C', staging, 'TensorNote-local-web'])
  console.log(archive)
} finally { await rm(staging, { recursive: true, force: true }) }
