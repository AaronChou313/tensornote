---
id: training-inference
title: Transformer 训练与推理
section: Transformer
order: 7
tags: [training, autoregressive, inference, kv-cache]
prerequisites: [encoder-decoder, masking]
summary: 区分并行训练和逐 Token 生成，并建立 KV Cache 的基本直觉。
---

# Transformer 训练与推理

## 这一节解决什么问题

Transformer 训练时可以同时处理整个序列，为什么生成时仍然需要一个 Token 接一个 Token？

## 一句话理解

训练时目标序列已知，可用 Causal Mask 并行计算所有位置；推理时未来 Token 尚未产生，只能逐步追加。

## Training

Teacher Forcing 把目标序列右移作为输入。虽然所有位置一起进入模型，Causal Mask 仍保证第 `t` 个位置看不到未来答案。

```text
input : <BOS> I like
target: I     like cats
```

## Autoregressive Inference

```text
Prompt
→ Token 1
→ Prompt + Token 1
→ Token 2
→ ...
```

每一步只新增一个 Token。已生成前缀不会改变，因此前面位置的 K/V 可以缓存。

## KV Cache

若当前层已计算前 `t` 个 Token 的：

```text
K_cache : [B,H,t,d_head]
V_cache : [B,H,t,d_head]
```

下一步只需为新 Token 计算一组 K/V，再追加到 Cache。Query 只对应当前新位置。

> [!important]
> KV Cache 减少重复计算，但会占用随序列长度增长的显存。它不改变模型输出定义，只改变推理实现。

## 我现在需要记住什么

并行训练来自已知完整目标与 Causal Mask。逐步推理来自未来 Token 不存在。KV Cache 用空间换取更少重复计算。
