import { parse } from 'yaml'
import type { ExperimentReference } from './types'

const EXPERIMENT_BLOCK = /```tensornote-experiment\s*\n([\s\S]*?)```/g

export function parseExperimentReference(source: string, sourceOffset = 0): ExperimentReference {
  let value: unknown
  try { value = parse(source) }
  catch { value = undefined }
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  return {
    manifest: typeof record.manifest === 'string' ? record.manifest.trim() : '',
    ...(typeof record.preset === 'string' && record.preset.trim() ? { preset: record.preset.trim() } : {}),
    sourceOffset,
  }
}

export function extractExperimentReferences(content: string): ExperimentReference[] {
  return [...content.matchAll(EXPERIMENT_BLOCK)].map((match) => parseExperimentReference(match[1], match.index ?? 0))
}
