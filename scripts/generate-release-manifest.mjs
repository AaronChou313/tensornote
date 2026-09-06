#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

async function assetFiles(root, directory = root) {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`Release assets cannot contain symbolic links: ${relative(root, path)}`)
    if (entry.isDirectory()) result.push(...await assetFiles(root, path))
    else if (entry.isFile() && !['release-manifest.json', 'SHA256SUMS'].includes(entry.name)) result.push(path)
  }
  return result
}

export async function generateReleaseManifest({ assetsDirectory, outputDirectory = assetsDirectory, version, tag, revision, distribution }) {
  if (tag !== `v${version}`) throw new Error(`Release tag ${tag} does not match v${version}`)
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(revision ?? '')) throw new Error('Release revision must be a complete Git commit SHA')
  const assetsRoot = resolve(assetsDirectory)
  const outputRoot = resolve(outputDirectory)
  const assets = []
  for (const path of (await assetFiles(assetsRoot)).sort()) {
    const data = await readFile(path)
    assets.push({
      name: basename(path),
      path: relative(assetsRoot, path).split('\\').join('/'),
      size: data.byteLength,
      sha256: createHash('sha256').update(data).digest('hex'),
    })
  }
  if (assets.length === 0) throw new Error('No release assets were found')
  const manifest = {
    schemaVersion: 1,
    product: 'TensorNote',
    version,
    tag,
    revision,
    ...(distribution ? { distribution } : {}),
    generatedAt: new Date().toISOString(),
    assets,
  }
  await mkdir(outputRoot, { recursive: true })
  await writeFile(join(outputRoot, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(join(outputRoot, 'SHA256SUMS'), `${assets.map((asset) => `${asset.sha256}  ${asset.path}`).join('\n')}\n`)
  return manifest
}

function parseArguments(argv) {
  const value = (name) => {
    const index = argv.indexOf(name)
    return index < 0 ? undefined : argv[index + 1]
  }
  return {
    assetsDirectory: value('--assets'),
    outputDirectory: value('--output') || value('--assets'),
    version: value('--version'),
    tag: value('--tag'),
    revision: value('--revision'),
    policyFile: value('--policy'),
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArguments(process.argv.slice(2))
  if (!options.assetsDirectory || !options.version || !options.tag || !options.revision) throw new Error('Usage: generate-release-manifest.mjs --assets DIR --version X.Y.Z --tag vX.Y.Z --revision SHA [--output DIR]')
  if (options.policyFile) options.distribution = JSON.parse(await readFile(options.policyFile, 'utf8'))
  const result = await generateReleaseManifest(options)
  console.log(`TensorNote release manifest: ${result.assets.length} assets · ${result.tag}`)
}
