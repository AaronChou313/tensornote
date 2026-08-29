---
id: initialization-normalization
title: 初始化与归一化
section: Deep Learning / 基础
order: 4
tags: [xavier, he, batchnorm, layernorm, gradient]
prerequisites: [loss-backpropagation]
summary: 理解信号尺度如何影响深层网络，并为 Transformer 的 LayerNorm 建立基础。
---

# 初始化与归一化

## 这一节解决什么问题

深层网络反复做线性变换与非线性变换。如果每层都放大或缩小一点，几十层后激活和梯度可能爆炸或消失。

## 一句话理解

Initialization 控制训练起点的信号尺度，Normalization 在训练过程中重新校准表示的统计范围。

## 核心结构

Xavier Initialization 适合对称激活，目标是平衡前后层方差。He Initialization 针对 ReLU 造成的部分激活截断，使用更大的初始方差。

BatchNorm 与 LayerNorm 的统计轴不同。给定：

```text
X : [B, N, D]
```

- BatchNorm 常跨 Batch 统计同一通道。
- LayerNorm 在每个样本、每个 Token 的特征维 `D` 内统计。

$$\operatorname{LN}(x)=\gamma\frac{x-\mu}{\sqrt{\sigma^2+\epsilon}}+\beta$$

> [!bridge]
> Transformer 的 Token 数量和 Batch 组成可以变化。LayerNorm 不依赖其他样本，因此更适合对每个 Token Representation 做稳定化。

## Python 实验

```python exec lab="batchnorm-vs-layernorm" cell="1" title="构造三维输入"
import torch
torch.manual_seed(2)
X = torch.randn(2, 3, 4) * 3 + 5
print("X:", X.shape)
```

```python exec lab="batchnorm-vs-layernorm" cell="2" title="比较统计轴"
layer_mean = X.mean(dim=-1)
layer_var = X.var(dim=-1, unbiased=False)
manual_ln = (X - X.mean(-1, keepdim=True)) / torch.sqrt(X.var(-1, keepdim=True, unbiased=False) + 1e-5)
print("per-token mean after LN:\n", manual_ln.mean(-1))
print("per-token var after LN:\n", manual_ln.var(-1, unbiased=False))
```

## 容易混淆的地方

Normalization 不能修复错误的学习率或数据问题。它改善优化条件，但不是保证模型正确的魔法层。

## 我现在需要记住什么

先问归一化沿哪些轴统计，再谈它的名字。LayerNorm 以单个 Token 的特征为单位，这一点会贯穿 Transformer。
