---
id: masking
title: Padding Mask 与 Causal Mask
section: Transformer
order: 4
tags: [mask, causal, padding, autoregressive, attention]
prerequisites: [self-attention]
summary: 在 Softmax 之前控制哪些 Key 对当前 Query 可见。
---

# Padding Mask 与 Causal Mask

## 这一节解决什么问题

Batch 中的 Padding 不应被关注，自回归 Decoder 也不能看到未来 Token。如何在不改变 Attention 结构的情况下加入这些约束？

## 一句话理解

Mask 在 Softmax 前把不可见位置的分数设为极小值，使其概率接近 0。

## 两类 Mask

Padding Mask 根据每条样本的有效长度屏蔽补齐位置。Causal Mask 保证第 `t` 个位置只能看 `≤t` 的 Token。

```text
1 0 0 0
1 1 0 0
1 1 1 0
1 1 1 1
```

数学上：

$$A=\operatorname{softmax}(S+M)$$

可见位置的 `M=0`，不可见位置的 `M=-∞`。

## Shape / 数据流

Attention Scores 常为 `[B,H,N,N]`。Mask 可以从 `[N,N]` 或 `[B,1,1,N]` 广播到相同 Shape。

## Python 实验

```python exec lab="causal-attention-mask" cell="1" title="构造 Causal Mask"
import torch
N = 5
scores = torch.randn(N, N)
allowed = torch.tril(torch.ones(N, N, dtype=torch.bool))
masked_scores = scores.masked_fill(~allowed, float("-inf"))
print(allowed.int())
```

```python exec lab="causal-attention-mask" cell="2" title="比较 Softmax 权重"
weights = torch.softmax(masked_scores, dim=-1)
print(weights)
print("future weight sum:", weights.masked_select(~allowed).sum().item())
```

> [!pitfall]
> Mask 通常作用于 Softmax 之前的 Score，而不是事后把概率乘 0。事后清零会破坏每行概率和为 1 的归一化。

## 我现在需要记住什么

Mask 定义 Attention 的可见性。Padding Mask 处理无效输入，Causal Mask 维护生成时的信息边界。
