import { TENSORNOTE_VERSION } from './constants'
import { validateExtensionManifest } from './manifest'
import type { ExtensionManifest, ExtensionModule } from './types'

export interface LocalExtensionBundle {
  manifest: ExtensionManifest
  script: File
}

export async function stageLocalExtension(files: FileList | File[]): Promise<LocalExtensionBundle> {
  const selected = Array.from(files)
  const manifestFile = selected.find((file) => file.name.endsWith('.json'))
  if (!manifestFile) throw new Error('请选择插件 Manifest JSON 与入口 JS/MJS 文件')
  let parsed: unknown
  try { parsed = JSON.parse(await manifestFile.text()) } catch { throw new Error('Manifest 不是有效的 JSON') }
  const manifest = validateExtensionManifest(parsed, TENSORNOTE_VERSION)
  if (!manifest.entry) throw new Error('本地插件 Manifest 必须声明 entry')
  const entryName = manifest.entry.split('/').pop()
  const script = selected.find((file) => file.name === entryName)
  if (!script || !/\.(?:m?js)$/.test(script.name)) throw new Error(`没有找到入口脚本：${manifest.entry}`)
  return { manifest, script }
}

export async function importLocalExtension(script: File): Promise<ExtensionModule> {
  const url = URL.createObjectURL(new Blob([await script.text()], { type: 'text/javascript' }))
  try {
    const imported = await import(/* @vite-ignore */ url) as { default?: ExtensionModule; activate?: ExtensionModule['activate'] }
    const module = imported.default ?? imported
    if (typeof module.activate !== 'function') throw new Error('插件入口必须导出 activate(api)')
    return module as ExtensionModule
  } finally {
    URL.revokeObjectURL(url)
  }
}
