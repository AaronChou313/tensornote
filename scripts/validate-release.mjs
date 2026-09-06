#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDocument } from 'yaml'

const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

async function exists(path) {
  try { await access(path); return true } catch { return false }
}

function cargoVersion(source) {
  const packageBlock = source.match(/\[package\]([\s\S]*?)(?:\n\[|$)/)?.[1] ?? ''
  return packageBlock.match(/^version\s*=\s*"([^"]+)"/m)?.[1]
}

function validUpdaterPublicKey(value) {
  if (typeof value !== 'string' || !value) return false
  try {
    return Buffer.from(value, 'base64').toString('utf8').includes('minisign public key')
  } catch {
    return false
  }
}

export async function validateRelease({ root = '.', tag } = {}) {
  const repository = resolve(root)
  const findings = []
  const add = (code, message, file) => findings.push({ code, message, file })
  const read = async (path) => readFile(join(repository, path), 'utf8')

  const packageJson = JSON.parse(await read('package.json'))
  const tauriConfig = JSON.parse(await read('src-tauri/tauri.conf.json'))
  const tauriReleaseConfig = JSON.parse(await read('src-tauri/tauri.release.conf.json'))
  const desktopCapability = JSON.parse(await read('src-tauri/capabilities/default.json'))
  const cargoToml = await read('src-tauri/Cargo.toml')
  const tauriBootstrap = await read('src-tauri/src/lib.rs')
  const version = packageJson.version
  const expectedTag = `v${version}`

  if (!semver.test(version ?? '')) add('version', 'package.json must contain a semantic version', 'package.json')
  if (cargoVersion(cargoToml) !== version) add('version', 'Cargo package version must match package.json', 'src-tauri/Cargo.toml')
  if (tauriConfig.version !== version) add('version', 'Tauri bundle version must match package.json', 'src-tauri/tauri.conf.json')
  if (tag && tag !== expectedTag) add('tag', `Release tag ${tag} must equal ${expectedTag}`, '.git')
  if (packageJson.license !== 'Apache-2.0') add('license', 'Application package must remain Apache-2.0', 'package.json')
  if (!await exists(join(repository, 'LICENSE'))) add('license', 'Root LICENSE is required', 'LICENSE')
  if (!await exists(join(repository, `docs/releases/v${version}.md`))) add('release-notes', `Missing docs/releases/v${version}.md`, `docs/releases/v${version}.md`)

  if (tauriConfig.bundle?.active !== true) add('bundle', 'Tauri bundling must be active', 'src-tauri/tauri.conf.json')
  if (tauriReleaseConfig.bundle?.createUpdaterArtifacts !== true) add('updater', 'Release builds must enable Tauri updater artifacts', 'src-tauri/tauri.release.conf.json')
  for (const dependency of ['@tauri-apps/plugin-process', '@tauri-apps/plugin-updater']) {
    if (!packageJson.dependencies?.[dependency]) add('updater', `Missing Desktop dependency ${dependency}`, 'package.json')
  }
  const desktopCrates = new Map([
    ['tauri-plugin-process', 'tauri_plugin_process::init()'],
    ['tauri-plugin-updater', 'tauri_plugin_updater::Builder::new().build()'],
  ])
  for (const [crate, registration] of desktopCrates) {
    if (!cargoToml.includes(`${crate} =`)) add('updater', `Missing Desktop crate ${crate}`, 'src-tauri/Cargo.toml')
    if (!tauriBootstrap.includes(registration)) add('updater', `Desktop bootstrap must register ${crate}`, 'src-tauri/src/lib.rs')
  }
  for (const permission of ['process:allow-restart', 'updater:default']) {
    if (!desktopCapability.permissions?.includes(permission)) add('updater', `Desktop capability must include ${permission}`, 'src-tauri/capabilities/default.json')
  }
  const updater = tauriConfig.plugins?.updater
  if (!validUpdaterPublicKey(updater?.pubkey)) add('updater', 'Updater must contain a committed minisign public key', 'src-tauri/tauri.conf.json')
  if (!Array.isArray(updater?.endpoints) || updater.endpoints.length === 0 || updater.endpoints.some((endpoint) => !endpoint.startsWith('https://'))) {
    add('updater', 'Updater endpoints must be a non-empty HTTPS list', 'src-tauri/tauri.conf.json')
  }

  const releaseWorkflow = await read('.github/workflows/release.yml').catch(() => '')
  const releaseWorkflowDocument = parseDocument(releaseWorkflow)
  for (const error of releaseWorkflowDocument.errors) add('workflow', error.message, '.github/workflows/release.yml')
  for (const marker of ['tags:', 'tauri-apps/tauri-action@v1', 'generate-release-manifest.mjs', 'release-gate', 'APPLE_CERTIFICATE', 'WINDOWS_CERTIFICATE', 'TAURI_SIGNING_PRIVATE_KEY', 'docker build', 'gh release download', 'actions/deploy-pages']) {
    if (!releaseWorkflow.includes(marker)) add('workflow', `Release workflow is missing ${marker}`, '.github/workflows/release.yml')
  }

  const workspaceWorkflow = await read('skills/tensornote-knowledge-workspace/assets/publish-tensornote.yml')
  if (!workspaceWorkflow.includes(`publish-workspace.yml@${expectedTag}`) || !workspaceWorkflow.includes(`runtime_ref: ${expectedTag}`)) {
    add('workspace-template', `Published Workspace template must pin the TensorNote Runtime to ${expectedTag}`, 'skills/tensornote-knowledge-workspace/assets/publish-tensornote.yml')
  }

  return { ok: findings.length === 0, root: repository, version, tag: expectedTag, findings }
}

function parseArguments(argv) {
  const value = (name) => {
    const index = argv.indexOf(name)
    return index < 0 ? undefined : argv[index + 1]
  }
  return { root: value('--root') || '.', tag: value('--tag'), json: argv.includes('--json') }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { json, ...options } = parseArguments(process.argv.slice(2))
  const result = await validateRelease(options)
  if (json) console.log(JSON.stringify(result, null, 2))
  else if (result.ok) console.log(`TensorNote release validation: PASS · ${result.tag} · updater + workflow + templates`)
  else {
    for (const finding of result.findings) console.error(`ERROR [${finding.code}] ${finding.file}: ${finding.message}`)
    console.error(`TensorNote release validation: FAIL · ${result.findings.length} issue(s)`)
  }
  process.exitCode = result.ok ? 0 : 1
}
