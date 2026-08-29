---
id: cnn-to-vit
title: 从 CNN 到 ViT
section: Deep Learning / CNN
order: 4
tags: [cnn, vit, inductive-bias, locality, token]
prerequisites: [resnet, self-attention]
summary: 比较结构先验与数据驱动关系建模，并提出“图片能否成为 Token 序列”。
---

# 从 CNN 到 ViT

## 这一节解决什么问题

Transformer 已能处理 Token 序列。如果图片也能转换为 Token，我们是否还能使用同一套 Attention 结构？

## 一句话理解

CNN 把局部性写入结构，ViT 把图片切成 Patch Token，把更多位置关系交给 Attention 学习。

## CNN 的结构先验

- Locality：Kernel 先处理邻近像素。
- Translation Equivariance：同一 Kernel 在不同位置共享。
- Hierarchy：分辨率下降，通道与语义层级增加。

这些约束是 Inductive Bias。它们让 CNN 在数据有限时更容易学到有效视觉模式。

## Transformer 的选择

Self-Attention 能让任意两个 Token 直接建立关系，但它本身不知道图片的二维局部结构。ViT 通过 Patch Embedding 把图片转换为：

```text
[B, C, H, W]
→ [B, N, P²C]
→ [B, N, d_model]
```

之后就可以复用 Transformer Encoder。

| CNN | ViT |
|---|---|
| Pixel / Grid | Patch Token |
| Convolution | Self-Attention |
| 强局部先验 | 较弱局部先验 |
| 结构驱动较多 | 数据与预训练驱动较多 |

> [!question]
> 如果一个 Patch 是视觉 Token，那么 Patch 的大小如何影响 Token 数量、计算量和细节保留？下一阶段会用 Shape 回答。

## 我现在需要记住什么

ViT 不是否定 CNN，而是选择不同的先验分配方式。真正的桥梁是把 Image 转换成 Token Sequence。
