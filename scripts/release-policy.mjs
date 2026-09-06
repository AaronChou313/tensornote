import { readFile, appendFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function requiredReleaseCredentials(policy) {
  if (!['github-community', 'trusted-desktop'].includes(policy.channel)
      || policy.updaterSigning !== 'required'
      || policy.platformSigning !== (policy.channel === 'trusted-desktop' ? 'required' : 'optional')) {
    throw new Error('Invalid release policy; updater signing is always required')
  }
  return ['TAURI_SIGNING_PRIVATE_KEY', 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD',
    ...(policy.platformSigning === 'required' ? ['APPLE_CERTIFICATE', 'APPLE_CERTIFICATE_PASSWORD', 'APPLE_ID', 'APPLE_PASSWORD', 'APPLE_TEAM_ID', 'WINDOWS_CERTIFICATE', 'WINDOWS_CERTIFICATE_PASSWORD'] : [])]
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const policy = JSON.parse(await readFile('release-policy.json', 'utf8'))
  const credentials = requiredReleaseCredentials(policy)
  if (process.argv.includes('--check-environment')) {
    const missing = credentials.filter((name) => !process.env[name])
    if (missing.length) throw new Error(`Missing release credentials: ${missing.join(', ')}`)
  }
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `platform-signing=${policy.platformSigning}\nchannel=${policy.channel}\n`)
  console.log(`Release channel: ${policy.channel}; platform signing: ${policy.platformSigning}; updater signing: required`)
}
