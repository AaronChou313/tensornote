import { ArrowRight, Brain, Eye, Flask, TextT, Waveform } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

const routes = [
  {
    label: '视觉表示',
    path: ['Deep Learning', 'CNN', 'ResNet', 'ViT'],
    description: '从局部感受野到视觉 Token，理解图像如何成为可学习的表示。',
    to: '/notes/deep-learning-overview',
    icon: Eye,
  },
  {
    label: '序列表示',
    path: ['Embedding', 'RNN', 'Attention', 'Transformer'],
    description: '从状态传播到 Token 之间的直接关系，理解序列建模的演化。',
    to: '/notes/sequence-and-rnn',
    icon: Waveform,
  },
]

export function HomePage() {
  return (
    <main className="home-page px-5 py-12 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1040px]">
        <header className="max-w-3xl">
          <div className="mb-6 flex items-center gap-3 text-[var(--accent)]">
            <Brain size={24} weight="duotone" />
            <span className="font-mono text-xs font-semibold tracking-[0.08em]">TENSORNOTE</span>
          </div>
          <h1 className="text-4xl font-semibold leading-[1.06] tracking-[-0.045em] md:text-6xl">从张量出发，建立完整的 AI 心智模型。</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg">理论负责建立结构，Shape 负责检查理解，Python 实验负责验证直觉。所有知识始终保存在可独立阅读的 Markdown 中。</p>
        </header>

        <section className="mt-14 grid gap-4 md:grid-cols-2" aria-label="学习主线">
          {routes.map((route) => {
            const Icon = route.icon
            return (
              <Link key={route.label} to={route.to} className="route-card group">
                <span className="route-card__icon"><Icon size={22} weight="duotone" /></span>
                <h2>{route.label}</h2>
                <p>{route.description}</p>
                <div className="route-path">
                  {route.path.map((item, index) => (
                    <span key={item}>
                      {item}
                      {index < route.path.length - 1 && <ArrowRight size={12} />}
                    </span>
                  ))}
                </div>
              </Link>
            )
          })}
        </section>

        <section className="knowledge-convergence">
          <div className="convergence-source">
            <span><Eye size={18} /> ViT</span>
            <span><TextT size={18} /> Transformer</span>
          </div>
          <ArrowRight size={24} className="convergence-arrow" />
          <Link to="/notes/clip-overview" className="convergence-clip">
            <strong>CLIP</strong>
            <span>Vision + Language</span>
          </Link>
          <ArrowRight size={24} className="convergence-arrow" />
          <div className="convergence-future">
            <span>VLM</span>
            <span>VLA</span>
            <small>Future</small>
          </div>
        </section>

        <section className="mt-14 flex flex-col gap-4 border-t border-[var(--line)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Flask size={21} className="mt-0.5 text-[var(--accent)]" />
            <div>
              <h2 className="text-sm font-semibold">核心验收路径</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">打开 Self-Attention，运行 7 个 Cell，观察 Attention Heatmap。</p>
            </div>
          </div>
          <Link to="/notes/self-attention" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline">
            开始实验 <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </main>
  )
}
