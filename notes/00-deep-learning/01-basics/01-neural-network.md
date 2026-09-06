---
id: neural-network
title: 神经网络与表示学习
section: Deep Learning / 基础
order: 1
tags: [mlp, linear, activation, representation, shape]
prerequisites: []
background: [linear-algebra]
summary: 从 Linear、Activation 和 Layer 出发，理解深层网络如何逐步改变输入的表示空间。
---

# 神经网络与表示学习

## 这一节解决什么问题

神经网络为什么要堆叠很多层，每一层到底做了什么？

## 一句话理解

> [!intuition]
> 神经网络本质上是在反复把输入映射到新的表示空间，让任务需要的结构变得更容易分离。

## 为什么需要它

单个线性变换只能旋转、缩放和移动空间，无法形成弯曲的决策边界。激活函数（Activation Function）在层之间加入非线性，使多层组合真正比一层更有表达力。

## 核心结构

一层网络通常写成：

$$z = xW+b, \qquad a=g(z)$$

其中 `W` 和 `b` 是参数（Parameter），`z` 是线性输出，`a` 是激活（Activation）。当这些激活被下一层使用时，也可称为特征或表示（Representation）。

```mermaid
flowchart LR
  X[输入 x] --> L1[Linear]
  L1 --> R1[ReLU]
  R1 --> L2[Linear]
  L2 --> Y[输出]
```

## Shape / 数据流

```text
X  : [B, d_in]
W1 : [d_in, d_hidden]
b1 : [d_hidden]
H  : [B, d_hidden]
W2 : [d_hidden, d_out]
Y  : [B, d_out]
```

Bias 会沿 Batch 维广播。检查矩阵乘法中间维是否相等，是发现 Shape 错误的第一步。

## 容易混淆的地方

> [!pitfall]
> Layer 的输出数值是 Activation，产生这些数值的 W 和 b 才是 Parameter。二者都会参与前向计算，但只有参数被优化器更新。

## Python 实验

```python exec lab="two-layer-mlp-forward" cell="1" title="构造参数与输入"
import torch
torch.manual_seed(0)
X = torch.randn(3, 4)
W1 = torch.randn(4, 6)
b1 = torch.zeros(6)
W2 = torch.randn(6, 2)
b2 = torch.zeros(2)
print("X:", X.shape)
```

```python exec lab="two-layer-mlp-forward" cell="2" title="手写两层 Forward"
H = torch.relu(X @ W1 + b1)
Y = H @ W2 + b2
print("H:", H.shape)
print("Y:", Y.shape)
print(Y)
```

## 我现在需要记住什么

- Linear 改变表示空间，Activation 引入非线性。
- 深度来自函数复合，不只是参数变多。
- 每一层都要同时理解公式、语义和 Shape。
