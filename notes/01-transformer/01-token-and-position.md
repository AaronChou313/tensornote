---
id: token-and-position
title: Token、Embedding 与 Position
section: Transformer
order: 1
tags: [tokenizer, embedding, positional-encoding, shape]
prerequisites: [embedding-evolution]
summary: 把离散 Token 变成连续表示，并显式注入顺序信息。
---

# Token、Embedding 与 Position

## 这一节解决什么问题

Transformer 接收的是向量，不是字符串；Attention 本身也不区分先后。如何同时提供语义与位置？

## 一句话理解

Tokenizer 产生离散 ID，Embedding 把 ID 映射成向量，Position 为这些向量注入序列顺序。

## 核心结构

```text
Text → Tokens → IDs → Token Embedding
                         +
                  Position Encoding
                         ↓
                  X:[B,N,d_model]
```

Embedding Matrix 为 `E:[V,d_model]`。一个 ID 序列 `[B,N]` 查表后得到 `[B,N,d_model]`。

## Position

没有 Position 时，Attention 对输入排列本身缺少顺序线索。常见方案：

- Sinusoidal Position Encoding：固定正弦与余弦模式。
- Learned Position Embedding：把位置也当成可训练 ID 查表。

二者都与 Token Embedding 保持相同 Shape 后相加。

## Python 实验

```python exec lab="sinusoidal-position-encoding" cell="1" title="构造 Position Encoding"
import torch, math
import matplotlib.pyplot as plt
N, D = 32, 24
position = torch.arange(N).unsqueeze(1)
div = torch.exp(torch.arange(0, D, 2) * (-math.log(10000.0) / D))
pe = torch.zeros(N, D)
pe[:, 0::2] = torch.sin(position * div)
pe[:, 1::2] = torch.cos(position * div)
print(pe.shape)
```

```python exec lab="sinusoidal-position-encoding" cell="2" title="绘制 Position Heatmap"
plt.figure(figsize=(7, 3.5))
plt.imshow(pe.T, aspect="auto", cmap="RdYlGn")
plt.xlabel("position"); plt.ylabel("dimension")
plt.colorbar(); plt.tight_layout(); plt.show()
```

## 容易混淆的地方

Position Encoding 不是给每个位置添加一个单独标量，而是添加一个 `d_model` 维向量。Token 与位置在同一表示空间内相加。

## 我现在需要记住什么

Self-Attention 建模关系，但顺序必须显式注入。进入 Attention 前的主 Shape 是 `[B,N,d_model]`。
