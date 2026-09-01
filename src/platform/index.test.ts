import { describe, expect, it } from 'vitest'
import {
  COMPUTE_PROVIDER_API_VERSION,
  CURRENT_WORKSPACE_SCHEMA_VERSION,
  EXECUTABLE_MARKDOWN_SYNTAX_VERSION,
  EXTENSION_API_VERSION,
  SECRET_MODEL_VERSION,
  SETTINGS_MODEL_VERSION,
  TENSORNOTE_VERSION,
  WORKSPACE_PROVIDER_API_VERSION,
  createExecutableLabMarkdown,
  extractLabs,
  parseWorkspaceManifestWithCompatibility,
} from './index'

describe('TensorNote v1 platform contracts', () => {
  it('publishes the first stable contract versions from one entrypoint', () => {
    expect(TENSORNOTE_VERSION).toBe('1.3.0')
    expect({
      workspaceSchema: CURRENT_WORKSPACE_SCHEMA_VERSION,
      workspaceProvider: WORKSPACE_PROVIDER_API_VERSION,
      computeProvider: COMPUTE_PROVIDER_API_VERSION,
      extension: EXTENSION_API_VERSION,
      executableMarkdown: EXECUTABLE_MARKDOWN_SYNTAX_VERSION,
      settings: SETTINGS_MODEL_VERSION,
      secrets: SECRET_MODEL_VERSION,
    }).toEqual({ workspaceSchema: 1, workspaceProvider: 1, computeProvider: 1, extension: 1, executableMarkdown: 1, settings: 1, secrets: 1 })
  })

  it('keeps executable Markdown portable and parseable through the v1 surface', () => {
    const markdown = createExecutableLabMarkdown({ id: 'hello-v1', difficulty: 'basic', cells: [{ title: 'Run', code: 'print("hello")' }] })
    const parsed = extractLabs(markdown)
    expect(markdown).toContain('```python exec')
    expect(parsed.labs[0]).toMatchObject({ id: 'hello-v1', cells: [expect.objectContaining({ code: 'print("hello")' })] })
  })

  it('keeps future workspace schemas readable but non-executable', () => {
    const result = parseWorkspaceManifestWithCompatibility('schemaVersion: 2\nfeatures:\n  executable: true')
    expect(result).toMatchObject({ compatibility: { status: 'future', readOnly: true }, manifest: { features: { executable: false } } })
  })
})
