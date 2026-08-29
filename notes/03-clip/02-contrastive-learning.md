---
id: contrastive-learning
title: CLIP Contrastive Learning
section: CLIP
order: 2
tags: [contrastive-loss, similarity-matrix, temperature, cross-entropy]
prerequisites: [dual-encoder, loss-backpropagation]
summary: 手写一个 Batch 内的图文相似度矩阵与双向 Cross Entropy。
---

# CLIP Contrastive Learning

## 这一节解决什么问题

只有配对的图像与文本，没有固定类别标签时，如何训练共享语义空间？

## 一句话理解

把 Batch 内所有图文两两比较，让正确配对的对角线相似度高，其他组合低。

## 核心结构

给定归一化表示：

$$Z_I\in\mathbb{R}^{B\times D}, \qquad Z_T\in\mathbb{R}^{B\times D}$$

Similarity Matrix：

$$S=\frac{Z_IZ_T^T}{\tau}, \qquad S\in\mathbb{R}^{B\times B}$$

`S[i,j]` 表示 Image i 与 Text j 的匹配分数。正确目标是对角线索引 `[0,1,...,B-1]`。

分别做两个方向的 Cross Entropy：

$$L=\frac{1}{2}(L_{image}+L_{text})$$

Image → Text 使用矩阵行，Text → Image 使用矩阵列。

## Python 实验

```python exec lab="clip-contrastive-loss" cell="1" title="构造图文 Embedding"
import torch
import torch.nn.functional as F
torch.manual_seed(9)
B, D = 4, 6
image_features = torch.randn(B, D)
text_features = image_features + 0.25 * torch.randn(B, D)
image_features = F.normalize(image_features, dim=-1)
text_features = F.normalize(text_features, dim=-1)
print(image_features.shape, text_features.shape)
```

```python exec lab="clip-contrastive-loss" cell="2" title="计算 Similarity Matrix"
temperature = 0.07
logits = image_features @ text_features.T / temperature
print("similarity:", logits.shape)
print(logits)
```

```python exec lab="clip-contrastive-loss" cell="3" title="计算双向 Loss"
targets = torch.arange(B)
loss_i = F.cross_entropy(logits, targets)
loss_t = F.cross_entropy(logits.T, targets)
loss = 0.5 * (loss_i + loss_t)
print("image to text:", loss_i.item())
print("text to image:", loss_t.item())
print("mean loss:", loss.item())
```

## 容易混淆的地方

Temperature 越小，Softmax 越尖锐。它控制分数尺度，不是简单的学习率。Batch 中其他样本充当负例，因此 Batch 组成会影响训练信号。

## 我现在需要记住什么

矩阵乘法 `[B,D]@[D,B]` 得到 `[B,B]`，对角线定义正配对，两个方向的 Cross Entropy 保持图文检索对称。
