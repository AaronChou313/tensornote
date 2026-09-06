#!/usr/bin/env node
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const version = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version
const skill = join(root, 'skills/tensornote-knowledge-workspace')
if (JSON.parse(await readFile(join(skill, 'package.json'), 'utf8')).version !== version) throw new Error('Skill and application versions must match')
const output = resolve(process.argv.slice(2).find((argument) => argument !== '--') || join(root, '.release'))
const archive = join(output, `TensorNote-agent-skill-${version}.tar.gz`)
const staging = await mkdtemp(join(tmpdir(), 'tensornote-skill-package-'))
try {
  const target = join(staging, 'tensornote-knowledge-workspace')
  await mkdir(target)
  for (const name of ['SKILL.md', 'agents', 'assets', 'references', 'scripts', 'package.json', 'package-lock.json']) {
    await cp(join(skill, name), join(target, name), { recursive: true, dereference: false, errorOnExist: true, force: false })
  }
  await cp(join(root, 'LICENSE'), join(target, 'LICENSE'))
  await mkdir(output, { recursive: true })
  execFileSync('tar', ['-czf', archive, '-C', staging, 'tensornote-knowledge-workspace'])
  console.log(archive)
} finally { await rm(staging, { recursive: true, force: true }) }
