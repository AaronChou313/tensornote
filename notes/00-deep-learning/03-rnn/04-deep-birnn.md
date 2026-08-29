---
id: deep-birnn
title: Deep RNN 与 Bidirectional RNN
section: Deep Learning / RNN
order: 4
tags: [deep-rnn, birnn, bidirectional, autoregressive]
prerequisites: [gru-lstm]
summary: 区分时间方向、层方向和双向上下文这三种信息传播。
---

# Deep RNN 与 Bidirectional RNN

## 这一节解决什么问题

单层 RNN 只沿一个时间方向更新状态。如何增加表示深度，又如何在允许时同时利用过去和未来？

## 一句话理解

Deep RNN 增加层方向的变换，BiRNN 增加相反时间方向的上下文。

## Deep RNN

```text
layer 2: h¹_t → h²_t
             ↑
layer 1: h¹_{t-1} → h¹_t → h¹_{t+1}
```

每个时间步既接收同层上一时刻状态，也接收下层当前时刻输出。输入通常为 `[B,T,D]`，层间保持 `T`，改变表示维度。

## Bidirectional RNN

```text
forward : past → current
backward: future → current
output  : concat(forward, backward)
```

如果每个方向隐藏维为 `H`，拼接后输出常为 `[B,T,2H]`。

> [!pitfall]
> 双向结构需要看到未来位置，因此不能直接用于严格自回归生成。生成第 t 个 Token 时，未来 Token 尚不存在。

## 与前后模型的关系

ELMo 使用双向语言模型构造上下文表示。Transformer Encoder 通过不带 Causal Mask 的 Self-Attention 同时使用两侧上下文；Decoder 则用 Causal Mask 保持自回归约束。

## 我现在需要记住什么

Deep 描述层数，Bidirectional 描述时间信息方向。看到输出 Shape 翻倍时，先检查是否拼接了两个方向。
