---
id: attention-transition
title: 从 Seq2Seq 到 Attention
section: Deep Learning / RNN
order: 7
tags: [attention, seq2seq, context, transformer-bridge]
prerequisites: [seq2seq-beam-search]
summary: 解除固定 Context Vector 的信息瓶颈，并提出 Transformer 的核心问题。
---

# 从 Seq2Seq 到 Attention

## 这一节解决什么问题

为什么 Decoder 必须依赖一个提前压缩好的固定向量？能否在每个生成时刻重新查找输入中的相关信息？

## 一句话理解

Attention 让 Decoder 对全部 Encoder State 计算权重，并按当前需要动态构造 Context。

## 为什么需要它

早期 Seq2Seq：

```text
整个输入 → 单一 Context Vector → 全部输出
```

Attention：

```text
Decoder Query
→ 比较所有 Encoder States
→ Attention Weights
→ 当前时刻专属 Context
```

## 核心结构

设 Encoder States 为 `H:[T_src,D]`，Decoder 当前状态为 `q:[D]`。匹配得到 `scores:[T_src]`，Softmax 后形成 `weights:[T_src]`，加权求和得到 `context:[D]`。

$$c_t=\sum_i\alpha_{t,i}h_i$$

每个 Decoder 时间步都有自己的 `α_t`，因此翻译不同输出词时可以关注不同输入位置。

> [!bridge]
> 如果 Attention 已经能直接建立 Token 与 Token 的关系，我们还一定需要 RNN 按顺序传播状态吗？Transformer 的答案是：不一定。

## 容易混淆的地方

Attention 不是自动生成解释。权重展示信息路由，但不总能当作因果解释。这里先把它作为可学习的检索和聚合机制。

## 我现在需要记住什么

Attention 把“提前压缩所有信息”改成“需要时查询相关信息”。Self-Attention 再让同一序列内部的 Token 彼此查询。
