---
id: ffn-residual-layernorm
title: FFN、Residual 与 LayerNorm
section: Transformer
order: 5
tags: [ffn, residual, layernorm, transformer-block]
prerequisites: [multi-head-attention, resnet, initialization-normalization]
summary: 区分 Token 间信息交换与 Token 内表示变换，并理解深层 Block 的稳定路径。
---

# FFN、Residual 与 LayerNorm

## 这一节解决什么问题

Attention 已经聚合上下文，为什么 Transformer Block 还需要 FFN、Residual 和 LayerNorm？

## 一句话理解

Attention 在 Token 之间交换信息，FFN 在每个 Token 内部变换表示，Residual 与 LayerNorm 保持深层训练稳定。

## Feed Forward Network

$$\operatorname{FFN}(x)=W_2\sigma(W_1x+b_1)+b_2$$

同一个 FFN 独立应用于每个 Token。它不混合 `N` 维，只把特征维从 `d_model` 扩展到 `d_ff`，再压回 `d_model`。

```text
[B,N,d_model]
→ [B,N,d_ff]
→ activation
→ [B,N,d_model]
```

## Residual 与 LayerNorm

Residual 要求子层输入输出 Shape 相同：

$$x' = x + \operatorname{Sublayer}(x)$$

LayerNorm 在每个 Token 的特征维上归一化。Post-LN 把 LN 放在残差相加后，Pre-LN 在子层之前做 LN。现代深层模型常使用 Pre-LN 以改善梯度流。

> [!bridge]
> ResNet 的残差路径在 CNN 中跨卷积块，Transformer 的残差路径在 Token 表示上跨 Attention 或 FFN 子层。共同点是保留可直接传播的旧表示。

## 容易混淆的地方

FFN 不是在整条序列上做一个全连接层。其权重跨位置共享，每个 Token 独立使用同一函数。

## 我现在需要记住什么

一个完整 Transformer Block 不等于 Attention。Token 关系、Token 内变换和稳定信息路径缺一不可。
