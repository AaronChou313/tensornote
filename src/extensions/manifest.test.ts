import { describe, expect, it } from 'vitest'
import { validateExtensionManifest } from './manifest'

describe('extension manifest', () => {
  it('accepts a compatible manifest and removes duplicate permissions', () => {
    const manifest = validateExtensionManifest({
      id: 'demo.tools',
      name: 'Demo Tools',
      version: '0.1.0',
      minTensorNoteVersion: '0.6.0',
      permissions: ['workspace:read', 'workspace:read'],
    }, '0.6.0')
    expect(manifest.permissions).toEqual(['workspace:read'])
    expect(manifest.apiVersion).toBe(1)
  })

  it('rejects invalid ids, unknown permissions, and incompatible versions', () => {
    const base = { id: 'demo.tools', name: 'Demo', version: '1.0.0', minTensorNoteVersion: '0.6.0' }
    expect(() => validateExtensionManifest({ ...base, id: 'Demo Tools' }, '0.6.0')).toThrow('Manifest id')
    expect(() => validateExtensionManifest({ ...base, permissions: ['camera'] }, '0.6.0')).toThrow('未知权限')
    expect(() => validateExtensionManifest({ ...base, minTensorNoteVersion: '0.7.0' }, '0.6.0')).toThrow('需要 TensorNote 0.7.0')
    expect(() => validateExtensionManifest({ ...base, apiVersion: 2 }, '0.8.2')).toThrow('Extension API v2')
  })
})
