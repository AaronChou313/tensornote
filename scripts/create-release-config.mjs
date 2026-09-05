#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function createWindowsReleaseConfig({ output, thumbprint, timestampUrl, baseConfig = { bundle: { createUpdaterArtifacts: true } } }) {
  const normalized = (thumbprint ?? '').replaceAll(/\s/g, '').toUpperCase()
  if (!/^[A-F0-9]{40}$/.test(normalized)) throw new Error('WINDOWS_CERTIFICATE_THUMBPRINT must contain exactly 40 hexadecimal characters')
  const timestamp = new URL(timestampUrl)
  if (timestamp.protocol !== 'https:') throw new Error('WINDOWS_TIMESTAMP_URL must use HTTPS')
  const config = {
    ...baseConfig,
    bundle: {
      ...baseConfig.bundle,
      windows: { certificateThumbprint: normalized, digestAlgorithm: 'sha256', timestampUrl: timestamp.href },
    },
  }
  const path = resolve(output)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`)
  return config
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputIndex = process.argv.indexOf('--output')
  const output = outputIndex < 0 ? undefined : process.argv[outputIndex + 1]
  if (!output) throw new Error('Usage: create-release-config.mjs --output PATH')
  const { readFile } = await import('node:fs/promises')
  await createWindowsReleaseConfig({
    output,
    thumbprint: process.env.WINDOWS_CERTIFICATE_THUMBPRINT,
    timestampUrl: process.env.WINDOWS_TIMESTAMP_URL,
    baseConfig: JSON.parse(await readFile(resolve('src-tauri/tauri.release.conf.json'), 'utf8')),
  })
  console.log(`Windows release signing config written to ${output}`)
}
