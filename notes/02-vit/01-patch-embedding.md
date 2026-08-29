---
id: patch-embedding
title: Patch Embedding
section: ViT
order: 1
tags: [patch, embedding, image-token, conv2d, shape]
prerequisites: [vit-overview, convolution]
summary: 逐步完成 Image、Patch、Flatten、Linear、Token 的 Shape 变换。
---

# Patch Embedding

## 这一节解决什么问题

图片 `[H,W,C]` 怎样转换为长度为 `N`、维度为 `d_model` 的 Token Sequence？

## 一句话理解

> [!intuition]
> Patch Embedding 是把每个局部图像块展平，再用可学习 Linear Projection 映射到统一 Token 维度的完整过程。

## 核心结构

Patch Size 为 `P×P` 时，Patch 数量：

$$N=\frac{HW}{P^2}$$

每个 Patch 从 `[P,P,C]` 展平成 `[P²C]`，再乘投影矩阵：

$$x_pE, \qquad E\in\mathbb{R}^{P^2C\times d_{model}}$$

## Shape / 数据流

```text
Image   : [B,C,H,W]
Patch   : [B,N,C,P,P]
Flatten : [B,N,P²C]
Linear  : [P²C,d_model]
Token   : [B,N,d_model]
```

`Conv2d(C,d_model,kernel_size=P,stride=P)` 可以等价完成 Patchify 与 Linear Projection。每个卷积输出位置就是一个 Patch Token。

## Python 实验

```python exec lab="patch-embedding-step-by-step" cell="1" title="构造并显示图片"
import torch
import matplotlib.pyplot as plt
torch.manual_seed(6)
B, C, H, W, P = 1, 3, 32, 32, 8
image = torch.rand(B, C, H, W)
plt.figure(figsize=(3, 3)); plt.imshow(image[0].permute(1, 2, 0)); plt.axis("off"); plt.show()
```

```python exec lab="patch-embedding-step-by-step" cell="2" title="划分 Patch"
patches = image.unfold(2, P, P).unfold(3, P, P)
patches = patches.permute(0, 2, 3, 1, 4, 5)
N = (H // P) * (W // P)
patches = patches.reshape(B, N, C, P, P)
print("patches:", patches.shape)
```

```python exec lab="patch-embedding-step-by-step" cell="3" title="可视化全部 Patch"
fig, axes = plt.subplots(H // P, W // P, figsize=(5, 5))
for ax, patch in zip(axes.flat, patches[0]):
    ax.imshow(patch.permute(1, 2, 0)); ax.axis("off")
plt.tight_layout(); plt.show()
```

```python exec lab="patch-embedding-step-by-step" cell="4" title="Flatten 并 Linear Projection"
flat = patches.flatten(2)
d_model = 24
projection = torch.nn.Linear(P * P * C, d_model)
tokens = projection(flat)
print("image:", image.shape)
print("flat patches:", flat.shape)
print("tokens:", tokens.shape)
```

```python exec lab="patch-embedding-step-by-step" cell="5" title="验证 Conv2d 等价 Shape"
conv = torch.nn.Conv2d(C, d_model, kernel_size=P, stride=P)
conv_tokens = conv(image).flatten(2).transpose(1, 2)
print("conv tokens:", conv_tokens.shape)
```

## 容易混淆的地方

Patch Embedding 不只是切图。切分、展平和可学习投影共同构成视觉 Token 化过程。

## 我现在需要记住什么

Patch 越小，Token 越多，保留细节更多，但 Attention 的 `N²` 成本更高。Shape 是这组取舍最直接的表达。
