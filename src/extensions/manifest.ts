import { extensionPermissions, type ExtensionManifest } from './types'
import { EXTENSION_API_VERSION } from './constants'

const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const idPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/

function compareVersions(left: string, right: string) {
  const a = left.split('-')[0].split('.').map(Number)
  const b = right.split('-')[0].split('.').map(Number)
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index]
  }
  return 0
}

export function validateExtensionManifest(value: unknown, tensorNoteVersion: string): ExtensionManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Manifest 必须是 JSON 对象')
  const input = value as Record<string, unknown>
  for (const key of ['id', 'name', 'version', 'minTensorNoteVersion']) {
    if (typeof input[key] !== 'string' || !input[key].trim()) throw new Error(`Manifest 缺少 ${key}`)
  }
  if (!idPattern.test(input.id as string)) throw new Error('Manifest id 只能包含小写字母、数字、点和连字符')
  if (!semverPattern.test(input.version as string) || !semverPattern.test(input.minTensorNoteVersion as string)) throw new Error('Manifest version 必须使用 x.y.z 格式')
  if (compareVersions(tensorNoteVersion, input.minTensorNoteVersion as string) < 0) {
    throw new Error(`该扩展需要 TensorNote ${input.minTensorNoteVersion} 或更高版本`)
  }
  const apiVersion = input.apiVersion ?? 1
  if (!Number.isInteger(apiVersion) || Number(apiVersion) < 1) throw new Error('Manifest apiVersion 必须是正整数')
  if (Number(apiVersion) > EXTENSION_API_VERSION) throw new Error(`该扩展需要 Extension API v${apiVersion}；当前仅支持 v${EXTENSION_API_VERSION}`)
  const permissions = input.permissions ?? []
  if (!Array.isArray(permissions) || permissions.some((permission) => !extensionPermissions.includes(permission as never))) {
    throw new Error('Manifest 包含未知权限')
  }
  for (const key of ['description', 'author', 'entry']) {
    if (input[key] !== undefined && typeof input[key] !== 'string') throw new Error(`Manifest ${key} 必须是字符串`)
  }
  return {
    id: input.id as string,
    name: input.name as string,
    version: input.version as string,
    minTensorNoteVersion: input.minTensorNoteVersion as string,
    apiVersion: Number(apiVersion),
    description: input.description as string | undefined,
    author: input.author as string | undefined,
    entry: input.entry as string | undefined,
    permissions: [...new Set(permissions)] as ExtensionManifest['permissions'],
  }
}

export const highRiskPermissions = new Set(['workspace:write', 'network', 'compute', 'secret'])
