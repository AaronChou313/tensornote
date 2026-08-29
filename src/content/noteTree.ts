export interface NoteTreeItem {
  label: string
  noteId?: string
  future?: boolean
  children?: NoteTreeItem[]
}

export const noteTree: NoteTreeItem[] = [
  {
    label: 'Deep Learning',
    noteId: 'deep-learning-overview',
    children: [
      {
        label: '基础',
        children: [
          { label: '神经网络', noteId: 'neural-network' },
          { label: '反向传播', noteId: 'loss-backpropagation' },
          { label: '优化与泛化', noteId: 'optimization-generalization' },
          { label: '初始化与归一化', noteId: 'initialization-normalization' },
          { label: 'PyTorch 训练循环', noteId: 'pytorch-training-loop' },
        ],
      },
      {
        label: 'CNN',
        children: [
          { label: '卷积', noteId: 'convolution' },
          { label: '特征层级', noteId: 'feature-hierarchy' },
          { label: 'ResNet', noteId: 'resnet' },
          { label: 'CNN 到 ViT', noteId: 'cnn-to-vit' },
        ],
      },
      {
        label: 'RNN',
        children: [
          { label: '序列与 RNN', noteId: 'sequence-and-rnn' },
          { label: 'BPTT', noteId: 'bptt' },
          { label: 'GRU 与 LSTM', noteId: 'gru-lstm' },
          { label: 'Deep 与 BiRNN', noteId: 'deep-birnn' },
          { label: 'Embedding 演化', noteId: 'embedding-evolution' },
          { label: 'Seq2Seq 与 Beam Search', noteId: 'seq2seq-beam-search' },
          { label: 'Attention 过渡', noteId: 'attention-transition' },
        ],
      },
    ],
  },
  {
    label: 'Transformer',
    noteId: 'transformer-overview',
    children: [
      { label: 'Token 与位置', noteId: 'token-and-position' },
      { label: 'Self-Attention', noteId: 'self-attention' },
      { label: 'Multi-Head Attention', noteId: 'multi-head-attention' },
      { label: 'Masking', noteId: 'masking' },
      { label: 'FFN / Residual / LN', noteId: 'ffn-residual-layernorm' },
      { label: 'Encoder 与 Decoder', noteId: 'encoder-decoder' },
      { label: '训练与推理', noteId: 'training-inference' },
    ],
  },
  {
    label: 'ViT',
    noteId: 'vit-overview',
    children: [
      { label: 'Patch Embedding', noteId: 'patch-embedding' },
      { label: 'ViT 结构', noteId: 'vit-architecture' },
      { label: 'CNN 与 ViT', noteId: 'cnn-vs-vit' },
      { label: 'ViT From Scratch', noteId: 'vit-from-scratch' },
    ],
  },
  {
    label: 'CLIP',
    noteId: 'clip-overview',
    children: [
      { label: 'Dual Encoder', noteId: 'dual-encoder' },
      { label: 'Contrastive Learning', noteId: 'contrastive-learning' },
      { label: 'Zero-Shot', noteId: 'zero-shot' },
      { label: '从 CLIP 到 VLM', noteId: 'clip-to-vlm' },
    ],
  },
  { label: 'LLM', future: true },
  { label: 'VLM', future: true },
  { label: 'VLA / Robotics', future: true },
]

export function findTrail(noteId: string, items = noteTree, trail: string[] = []): string[] {
  for (const item of items) {
    const nextTrail = [...trail, item.label]
    if (item.noteId === noteId) return nextTrail
    if (item.children) {
      const found = findTrail(noteId, item.children, nextTrail)
      if (found.length) return found
    }
  }
  return []
}
