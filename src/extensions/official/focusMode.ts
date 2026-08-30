import type { ExtensionManifest, ExtensionModule } from '../types'

export const focusModeManifest: ExtensionManifest = {
  id: 'tensornote.focus-mode',
  name: 'Focus Mode',
  version: '1.0.0',
  minTensorNoteVersion: '0.6.0',
  description: '隐藏工作台周边界面，让阅读与写作保持专注。',
  author: 'TensorNote',
  permissions: [],
}

export const focusModeExtension: ExtensionModule = {
  activate(api) {
    api.settings.register({
      key: 'hideStatusBar',
      label: 'Hide status bar in focus mode',
      description: '进入专注模式后同时隐藏底部扩展状态栏。',
      type: 'boolean',
      default: false,
    })
    api.views.register({
      id: 'tensornote.focus-mode.about',
      title: 'Focus Mode',
      description: 'Official extension',
      body: 'Focus Mode 会临时收起文件侧栏、标签工具和顶部操作，让当前 Markdown 文档成为唯一视觉焦点。再次执行命令即可恢复。',
    })
    api.commands.register({
      id: 'tensornote.focus-mode.toggle',
      label: 'Toggle focus mode',
      category: 'Extension',
      description: 'Hide or restore workbench chrome',
      execute: () => {
        const active = document.documentElement.classList.toggle('tensornote-focus-mode')
        document.documentElement.classList.toggle('tensornote-focus-hide-status', active && api.settings.get('hideStatusBar', false))
      },
    })
    api.commands.register({
      id: 'tensornote.focus-mode.about.open',
      label: 'About Focus Mode',
      category: 'Extension',
      execute: () => api.views.open('tensornote.focus-mode.about'),
    })
    api.sidebar.register({ id: 'tensornote.focus-mode.sidebar', label: 'Focus mode', commandId: 'tensornote.focus-mode.toggle' })
    api.statusBar.register({ id: 'tensornote.focus-mode.status', label: 'Focus', tooltip: 'Toggle Focus Mode', commandId: 'tensornote.focus-mode.toggle', align: 'right' })
  },
  deactivate() {
    document.documentElement.classList.remove('tensornote-focus-mode', 'tensornote-focus-hide-status')
  },
}
