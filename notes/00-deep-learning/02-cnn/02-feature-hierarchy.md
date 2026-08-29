---
id: feature-hierarchy
title: CNN Feature Hierarchy
section: Deep Learning / CNN
order: 2
tags: [cnn, receptive-field, pooling, hierarchy]
prerequisites: [convolution]
summary: 理解边缘、纹理、部件和对象如何在深层 CNN 中形成层级表示。
---

# CNN Feature Hierarchy

## 这一节解决什么问题

单个小 Kernel 只能看到局部像素，深层 CNN 为什么最终能识别完整对象？

## 一句话理解

浅层组合像素形成边缘，深层再组合前一层模式形成纹理、部件与对象级表示。

## 核心结构

```mermaid
flowchart LR
  P[Pixel] --> E[Edge]
  E --> T[Texture]
  T --> R[Part]
  R --> O[Object]
```

感受野（Receptive Field）表示某个激活在原图上能够依赖的区域。堆叠卷积、增加 Stride 或 Pooling 都会让深层位置看到更大范围。

## Shape / 数据流

典型 CNN 同时进行两种变化：

```text
Spatial resolution : H × W 逐步减小
Channel dimension  : C 逐步增加
```

空间位置变少，表示的语义种类变多。Downsampling 降低计算量，也让后续特征更关注存在什么，而不只关注精确像素位置。

## 容易混淆的地方

> [!pitfall]
> Feature Hierarchy 是训练后形成的表示组织方式，不是人为规定第一层必须检测边缘、最后一层必须检测对象。

Pooling 不是构建层级的唯一方式。带 Stride 的卷积也能完成下采样，并且其参数可学习。

## 与前后模型的关系

CNN 的局部性与层级结构属于 Inductive Bias。ViT 的标准结构较少预先写入这些约束，更依赖数据和 Attention 学习位置之间的关系。

## 我现在需要记住什么

深度扩大有效感受野，并让模型逐层组合模式。空间分辨率减少和通道增加，是理解 CNN Shape 的主线。
