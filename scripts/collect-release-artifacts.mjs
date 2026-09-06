#!/usr/bin/env node
import { copyFile, lstat, mkdir, readdir } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const selectors = {
  macOS: (name) => name.endsWith('.dmg') || name.endsWith('.app.tar.gz') || name.endsWith('.app.tar.gz.sig'),
  Windows: (name) => name.endsWith('.msi') || name.endsWith('.exe') || name.endsWith('.msi.sig') || name.endsWith('.exe.sig'),
  Linux: (name) => name.endsWith('.AppImage') || name.endsWith('.deb') || name.endsWith('.rpm') || name.endsWith('.AppImage.sig') || name.endsWith('.deb.sig') || name.endsWith('.rpm.sig'),
}

async function filesBelow(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`Release bundle cannot contain symbolic links: ${path}`)
    if (entry.isDirectory()) files.push(...await filesBelow(path))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

export async function collectReleaseArtifacts({ bundleRoot, outputDirectory, platform }) {
  const select = selectors[platform]
  if (!select) throw new Error(`Unsupported release platform: ${platform}`)
  const sourceRoot = resolve(bundleRoot)
  const sourceInfo = await lstat(sourceRoot).catch(() => null)
  if (!sourceInfo?.isDirectory()) throw new Error(`Release bundle root does not exist: ${sourceRoot}`)
  const selected = (await filesBelow(sourceRoot)).filter((path) => select(basename(path))).sort()
  if (selected.length === 0) throw new Error(`No ${platform} release artifacts found in ${sourceRoot}`)

  const outputRoot = resolve(outputDirectory)
  await mkdir(outputRoot, { recursive: true })
  const names = new Set()
  for (const source of selected) {
    const name = basename(source)
    if (names.has(name)) throw new Error(`Duplicate release asset name: ${name}`)
    names.add(name)
    await copyFile(source, join(outputRoot, name))
  }
  return [...names].sort()
}

function value(argv, name) {
  const index = argv.indexOf(name)
  return index < 0 ? undefined : argv[index + 1]
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2)
  const bundleRoot = value(argv, '--bundle-root')
  const outputDirectory = value(argv, '--output')
  const platform = value(argv, '--platform')
  if (!bundleRoot || !outputDirectory || !platform) throw new Error('Usage: collect-release-artifacts.mjs --bundle-root DIR --output DIR --platform macOS|Windows|Linux')
  const names = await collectReleaseArtifacts({ bundleRoot, outputDirectory, platform })
  console.log(`TensorNote ${platform} release artifacts: ${names.length} · ${names.join(', ')}`)
}
