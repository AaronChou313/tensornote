import { parse } from 'yaml'
import type { ExperimentReference } from './types'

const EXPERIMENT_BLOCK = /```tensornote-experiment\s*\n([\s\S]*?)```/g

export function extractExperimentReferences(content: string): ExperimentReference[] {
  return [...content.matchAll(EXPERIMENT_BLOCK)].map((match) => {
    let value: unknown
    try { value = parse(match[1]) }
    catch { value = undefined }
    const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
    return {
      manifest: typeof record.manifest === 'string' ? record.manifest.trim() : '',
      ...(typeof record.preset === 'string' && record.preset.trim() ? { preset: record.preset.trim() } : {}),
      sourceOffset: match.index ?? 0,
    }
  })
}

