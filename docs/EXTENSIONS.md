# TensorNote Extension Platform v1

TensorNote v0.6.0 支持官方扩展和用户从本机选择的本地扩展。当前版本没有公共在线插件市场，也不会下载或自动更新第三方插件。

## 1. 打开扩展管理器

打开任意 Workspace 后，点击顶栏的拼图图标。扩展管理器会显示：

- 已安装扩展、来源、版本、运行状态和已授权能力。
- 扩展公开的设置。
- 当前 View、Sidebar、Markdown、Editor 与 Provider 贡献数量。
- `Load local` 本地加载入口。

TensorNote 自带官方 `Focus Mode` 扩展。它是 Extension API 的首个真实使用者，注册了 Command、View、Sidebar Item、Setting 和 Status Bar Item。可以从左侧 `Extensions → Focus mode`、状态栏 `Focus` 或 `Ctrl/Cmd + P → Toggle focus mode` 调用。

## 2. 本地扩展包

v0.6.0 的本地扩展由两个文件组成：

```text
my-extension/
├── manifest.json
└── index.js
```

仓库提供了可直接加载的完整示例：`examples/extensions/hello/`。在扩展管理器中同时选择其中的 `manifest.json` 和 `index.js` 即可。

Manifest 最小示例：

```json
{
  "id": "example.hello",
  "name": "Hello Extension",
  "version": "0.1.0",
  "minTensorNoteVersion": "0.6.0",
  "apiVersion": 1,
  "entry": "index.js",
  "permissions": []
}
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 小写字母、数字、点和连字符；所有贡献 id 必须以它开头 |
| `name` | 是 | 扩展显示名称 |
| `version` | 是 | `x.y.z` 语义化版本 |
| `minTensorNoteVersion` | 是 | 最低兼容 TensorNote 版本 |
| `apiVersion` | 否 | Extension API 主版本；省略时按 v1 处理 |
| `entry` | 本地扩展必填 | 入口 `.js` 或 `.mjs` 文件名 |
| `description` / `author` | 否 | 描述和作者 |
| `permissions` | 否 | 请求的能力列表 |

入口导出 `activate(api)`，也可导出其他生命周期函数：

```js
export function load() {
  // Manifest 已验证，扩展记录进入 loaded 状态。
}

export function activate(api) {
  api.commands.register({
    id: 'example.hello.say-hello',
    label: 'Say hello',
    category: 'Extension',
    execute: () => window.alert('Hello from TensorNote'),
  })

  api.statusBar.register({
    id: 'example.hello.status',
    label: 'Hello',
    commandId: 'example.hello.say-hello',
    align: 'right',
  })
}

export function deactivate() {
  // 停用前的扩展自有清理；注册贡献由 Runtime 自动撤销。
}

export function dispose() {
  // 本地扩展被卸载时释放未交给 TensorNote 管理的资源。
}
```

入口应是单文件、浏览器可执行的 ESM。使用 TypeScript 或 npm 依赖时，请先用自己的构建工具打包为单个 `.js`/`.mjs`；Blob URL 加载的本地入口不能解析项目外部的裸包导入。

## 3. 加载顺序

1. 点击 `Load local`，一次同时选择 Manifest 和入口脚本。
2. TensorNote 只读取并验证 Manifest，此时脚本尚未执行。
3. 检查权限。高风险权限默认不选中，只有明确勾选后才授权。
4. 点击 `Trust & load` 后，TensorNote 才导入脚本并依次执行 `load → activate`。
5. 关闭开关时执行 `deactivate` 并自动撤销该扩展的所有贡献。
6. 卸载本地扩展时再执行 `dispose`。

浏览器刷新后，官方扩展会按保存的开关恢复；v0.6.0 不持久保存本地脚本内容，本地扩展需要重新选择文件加载。授权和设置保留在当前浏览器的 TensorNote 本地存储中。

## 4. 权限模型

| 权限 | API 能力 | 风险提示 |
| --- | --- | --- |
| `workspace:read` | `workspace.readText/list/registerProvider` | 读取当前 Workspace 内容 |
| `workspace:write` | `workspace.writeText` | 高风险；可以修改真实文件 |
| `network` | `network.fetch` | 高风险；可以向外部服务发送数据 |
| `compute` | `compute.registerProvider` | 高风险；可接入计算后端 |
| `secret` | `secrets.get/set/delete` | 高风险；会话级敏感值 |

API 调用必须同时满足“Manifest 已声明”和“用户已授权”。未声明或未授权都会在调用边界抛出错误。`secret` 数据只写入 `sessionStorage`，关闭浏览器会话后清除。

这套权限是 TensorNote API 的能力门控，不是 JavaScript 安全沙箱。本地脚本加载后与应用同源运行，理论上仍可直接访问浏览器环境。只加载你能审查并信任的插件源码；不要加载聊天、邮件或陌生网页提供的脚本。

## 5. Extension API v1

激活时 `api.apiVersion` 返回当前 API 主版本。TensorNote 会拒绝高于当前支持版本的 Manifest，而省略 `apiVersion` 的 v0.6.x 扩展继续按 v1 加载；这让旧扩展保持兼容，同时避免未来 API 被旧 Runtime 静默误用。

### Command

```js
api.commands.register({
  id: 'example.hello.command',
  label: 'Example command',
  category: 'Extension',
  execute: async () => {},
})
```

注册后自动进入统一 Command Palette。返回值是手动注销函数；扩展停用时 Runtime 仍会兜底清理。

### View 与 Sidebar Item

```js
api.views.register({
  id: 'example.hello.help',
  title: 'Hello Help',
  description: 'Local extension view',
  body: '这是一个声明式文本 View。',
})
api.views.open('example.hello.help')

api.sidebar.register({
  id: 'example.hello.sidebar',
  label: 'Say hello',
  commandId: 'example.hello.command',
})
```

v1 View 使用声明式标题、描述和文本正文，不允许插件直接挂载任意 React 组件。

### Markdown Processor

```js
api.markdown.registerProcessor('example.hello.processor', (markdown, context) => {
  return markdown.replaceAll('[[HELLO]]', `Hello from ${context.documentPath}`)
})
```

Processor 在 WikiLink 转换和 React Markdown 渲染前运行。应保持纯函数、同步、可重复，并返回标准 Markdown。

### Editor Extension

```js
api.editor.registerExtension('example.hello.editor', codeMirrorExtension)
```

参数是有效的 CodeMirror 6 Extension。建议插件自行打包 CodeMirror 依赖并保证与当前编辑器版本兼容。

### Settings

```js
api.settings.register({
  key: 'greeting',
  label: 'Greeting',
  type: 'text',
  default: 'Hello',
})

const greeting = api.settings.get('greeting', 'Hello')
api.settings.set('greeting', 'Hi')
```

支持 `boolean`、`text`、`select`。设置值由扩展管理器统一展示并持久化。

### Status Bar Item

```js
api.statusBar.register({
  id: 'example.hello.status',
  label: 'Hello',
  tooltip: 'Run hello command',
  commandId: 'example.hello.command',
  align: 'right',
})
```

### Workspace / Compute Provider

```js
api.workspace.registerProvider({
  id: 'example.hello.workspace-provider',
  label: 'Example Workspace',
  create: (config) => provider,
})

api.compute.registerProvider({
  id: 'example.hello.compute-provider',
  label: 'Example Compute',
  create: () => provider,
})
```

Provider 必须实现 TensorNote 对应的 `WorkspaceProvider` 或 `ComputeProvider` 契约。v0.6.0 会注册和展示 Provider 贡献；通用的 Provider 配置向导属于后续版本。

## 6. 开发与验证

推荐在单独目录开发插件，不要把密钥写进 Manifest 或入口脚本。每次修改后重新选择两个文件加载。至少验证：

- 开启、停用、再次启用和卸载的生命周期。
- 缺少授权时 API 明确失败，授权后才成功。
- 所有贡献 id 使用扩展 id 前缀。
- 明亮/暗色主题、窄屏和键盘 Command Palette。
- Markdown Processor 不破坏原始可移植 Markdown。

TensorNote Runtime 与 Manifest 的实现位于 `src/extensions/`；核心回归测试运行：

```bash
pnpm test
pnpm lint
pnpm build
```
