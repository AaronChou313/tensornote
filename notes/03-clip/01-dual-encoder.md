---
id: dual-encoder
title: Dual Encoder 与共享空间
section: CLIP
order: 1
tags: [dual-encoder, projection, normalization, cosine-similarity]
prerequisites: [clip-overview]
summary: 独立编码图像与文本，再投影到相同维度比较语义相似度。
---

# Dual Encoder 与共享空间

## 这一节解决什么问题

图像和文本来自完全不同的数据形式，如何让它们变成可直接比较的表示？

## 一句话理解

两个 Encoder 各自提取模态特征，再用 Projection Head 映射到同一个 D 维空间并做 L2 Normalization。

## 核心结构

Image Encoder 可以是 ResNet 或 ViT，Text Encoder 通常是 Transformer。它们得到中间特征后分别投影：

$$z_i=\frac{W_i f_i}{\|W_i f_i\|_2}, \qquad z_t=\frac{W_t f_t}{\|W_t f_t\|_2}$$

归一化后点积就是 Cosine Similarity：

$$s(i,t)=z_i^Tz_t$$

## Shape / 数据流

```text
Image feature   [B,D_i] → projection → [B,D]
Text feature    [B,D_t] → projection → [B,D]
L2 normalized   each row norm = 1
```

Projection 允许两个 Encoder 保持各自内部维度，只要求最终对齐空间相同。

> [!important]
> Dual Encoder 在编码后才进行轻量相似度比较，因此适合预先缓存大量图像或文本向量，实现高效检索。

## 容易混淆的地方

共享空间不表示两个 Encoder 共享参数。它们的输入、网络和权重都可以完全不同，训练目标只约束最终表示的相对几何关系。

## 我现在需要记住什么

Projection 对齐维度，Normalization 控制向量尺度，Cosine Similarity 衡量方向上的语义接近程度。
