import { getHostAdapter } from '../host/runtime'

const guideRoot = 'https://github.com/AaronChou313/tensornote/blob/main/docs'

/** Contextual help shares the same host/deployment capabilities as the application. */
export function GettingStarted({ context = 'home' }: { context?: 'home' | 'compute' }) {
  const native = getHostAdapter().capabilities.environmentDiscovery
  const mode = native ? '桌面版' : 'Web 版'
  const compute = native
    ? '需要运行实验时，在下方检测 Python 环境，选择已安装 Jupyter 的环境并点击“启动并连接”。没有合适环境时，可先查看创建环境的安装计划。'
    : '使用自己的 HTTPS Jupyter 服务，或选择 JupyterHub / BinderHub 连接。服务必须允许当前网站的来源和 Kernel WebSocket；普通 Notebook 分享链接不能作为服务地址。'
  return <aside className="getting-started" aria-label={`${mode}使用指引`}>
    <div className="getting-started__heading"><strong>{context === 'home' ? `当前使用${mode}` : `${mode} · 连接计算环境`}</strong><a href={`${guideRoot}/zh-CN/USER_GUIDE.md${context === 'compute' ? '#compute' : '#choose'}`} target="_blank" rel="noreferrer">使用说明 ↗</a></div>
    <p>{context === 'home' ? '先打开示例或自己的 Markdown 文件夹。阅读和写作不需要配置 Python 或 Jupyter。' : compute}</p>
    <details>
      <summary>{context === 'home' ? '需要运行实验或管理 Git 时' : '连接前需要准备什么？'}</summary>
      {context === 'home' && <p>{compute.replace('在下方检测', '在“设置 → 计算与 Jupyter”检测')}</p>}
      {context === 'compute' && <p>{native ? '基础环境只安装界面列出的包。PyTorch、CUDA 或笔记声明的依赖需要你另行审核和安装；已有 Jupyter 也可以直接连接。' : '已有服务选 Generic Jupyter；学校或团队平台选 JupyterHub 并使用自己的 API Token；公开仓库临时试验可选 BinderHub。公共 Binder 可能排队或不可用。'}</p>}
      <a href={`${guideRoot}/en/USER_GUIDE.md`} target="_blank" rel="noreferrer">English user guide ↗</a>
    </details>
  </aside>
}
