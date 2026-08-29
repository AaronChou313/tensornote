---
id: vit-from-scratch
title: ViT From Scratch
section: ViT
order: 4
tags: [vit, implementation, patch-embedding, shape]
prerequisites: [vit-architecture]
summary: 实现一个极小 ViT，并打印从图片到分类 Logits 的每一步 Tensor Shape。
---

# ViT From Scratch

## 这一节解决什么问题

如何把之前理解的模块组合成一个能完成前向计算的极小 ViT？

## 一句话理解

这个实验不追求精度，只要求每一步 Shape 都能解释。

## 完整流程

```text
PatchEmbedding
→ CLS
→ Position
→ TransformerEncoder
→ CLS Representation
→ Classifier
```

## Python 实验

```python exec lab="tiny-vit-from-scratch" cell="1" title="定义 TinyViT"
import torch
class TinyViT(torch.nn.Module):
    def __init__(self, image_size=32, patch=8, dim=32, classes=10):
        super().__init__()
        self.patch = torch.nn.Conv2d(3, dim, kernel_size=patch, stride=patch)
        n = (image_size // patch) ** 2
        self.cls = torch.nn.Parameter(torch.zeros(1, 1, dim))
        self.pos = torch.nn.Parameter(torch.randn(1, n + 1, dim) * 0.02)
        layer = torch.nn.TransformerEncoderLayer(dim, nhead=4, dim_feedforward=64, batch_first=True)
        self.encoder = torch.nn.TransformerEncoder(layer, num_layers=2)
        self.head = torch.nn.Linear(dim, classes)
    def forward(self, x):
        print("Input:", x.shape)
        x = self.patch(x); print("Patch grid:", x.shape)
        x = x.flatten(2).transpose(1, 2); print("Tokens:", x.shape)
        cls = self.cls.expand(x.size(0), -1, -1)
        x = torch.cat([cls, x], dim=1) + self.pos; print("With CLS:", x.shape)
        x = self.encoder(x); print("Encoder output:", x.shape)
        logits = self.head(x[:, 0]); print("Logits:", logits.shape)
        return logits
```

```python exec lab="tiny-vit-from-scratch" cell="2" title="运行一次 Forward"
model = TinyViT()
images = torch.randn(2, 3, 32, 32)
logits = model(images)
```

## 容易混淆的地方

`Conv2d` 输出 `[B,D,H/P,W/P]`，必须先 Flatten 空间维并 Transpose 才能得到 Transformer 需要的 `[B,N,D]`。

## 我现在需要记住什么

能从输入一路写出每一步 Shape，就掌握了 ViT 的骨架。训练策略和大规模数据属于下一层问题。
