export function activate(api) {
  api.commands.register({
    id: 'example.hello.say-hello',
    label: 'Say hello',
    category: 'Extension',
    description: 'Open the Hello Extension view',
    execute: () => api.views.open('example.hello.view'),
  })

  api.views.register({
    id: 'example.hello.view',
    title: 'Hello Extension',
    description: 'Local extension example',
    body: 'Hello from a local TensorNote extension. This view and its command will be removed automatically when the extension is disabled.',
  })

  api.sidebar.register({
    id: 'example.hello.sidebar',
    label: 'Hello extension',
    commandId: 'example.hello.say-hello',
  })

  api.statusBar.register({
    id: 'example.hello.status',
    label: 'Hello',
    tooltip: 'Open Hello Extension',
    commandId: 'example.hello.say-hello',
    align: 'right',
  })
}
