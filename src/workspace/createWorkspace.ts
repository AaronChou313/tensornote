const WINDOWS_RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i

export function validateKnowledgeBaseName(name: string): string | null {
  if (!name) return '请输入知识库名称'
  if (name !== name.trim()) return '知识库名称不能包含首尾空格'
  if (name === '.' || name === '..') return '知识库名称不能是 . 或 ..'
  if (/[\\/:*?"<>|\0]/.test(name)) return '知识库名称包含系统不允许的字符'
  if (WINDOWS_RESERVED.test(name)) return '该名称是 Windows 保留文件名'
  if (name.endsWith('.')) return '知识库名称不能以句点结尾'
  return null
}

export function createWorkspaceManifest(name: string) {
  const quotedName = JSON.stringify(name)
  return `schemaVersion: 1\n\nworkspace:\n  name: ${quotedName}\n\ncontent:\n  root: notes\n\nassets:\n  root: assets\n\nnavigation:\n  mode: filesystem\n\nfeatures:\n  executable: false\n\nenvironment:\n  files: []\n\npublishing: {}\n\nextensions: {}\n`
}
