---
id: cnn-vs-vit
title: CNN 与 ViT
section: ViT
order: 3
tags: [cnn, vit, inductive-bias, comparison]
prerequisites: [vit-architecture, feature-hierarchy]
summary: 比较两种视觉建模先验，而不是寻找脱离数据和任务的绝对赢家。
---

# CNN 与 ViT

## 这一节解决什么问题

CNN 与 ViT 都能处理图片，它们把哪些假设写进了结构，又把哪些关系留给数据学习？

## 一句话理解

CNN 预先强调局部与层级，ViT 用全局 Attention 和大规模预训练学习更多关系。

## 核心比较

| CNN | ViT |
|---|---|
| Pixel / Grid | Patch Token |
| Convolution | Self-Attention |
| 强 Locality | 弱 Locality Prior |
| Translation Equivariance | 依赖位置表示与数据 |
| Hierarchical Feature Map | Token Representation |

CNN 的强 Inductive Bias 在较小数据上常更有优势。ViT 的灵活关系建模在充足数据与预训练下能扩展得很好。

## Shape 视角

CNN 常沿深度逐步降低 `H,W` 并增加 `C`。标准 ViT 多数 Block 保持 `[B,N,D]` 不变，空间关系已经被转换到 Token 维 `N`。

> [!important]
> “先验更少”不等于“没有先验”。Patch Size、Position Embedding、模型宽度和数据增强都在影响 ViT 的学习方式。

## 与前后模型的关系

现代视觉模型也会混合两种思想，例如层级式 ViT、局部 Attention 或卷积 Stem。对比的目的不是划分阵营，而是识别信息如何流动。

## 我现在需要记住什么

CNN 把更多视觉结构先写进网络，ViT 把更多关系交给 Attention 与数据。选择取决于数据、算力和任务，而不是模型名称。
