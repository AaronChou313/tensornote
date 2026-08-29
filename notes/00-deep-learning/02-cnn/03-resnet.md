---
id: resnet
title: ResNet 与残差路径
section: Deep Learning / CNN
order: 3
tags: [resnet, residual, gradient, information-flow]
prerequisites: [feature-hierarchy, loss-backpropagation]
summary: 从信息路径与梯度路径理解 y = F(x) + x，而不只记住“可以训练更深网络”。
---

# ResNet 与残差路径

## 这一节解决什么问题

网络变深时，即使没有经典梯度消失，额外层也可能让优化变难。我们能否让新层只学习对已有表示的必要修改？

## 一句话理解

> [!intuition]
> Residual Block 保留一条原表示的直达路径，让 F(x) 专注学习“还需要改变多少”。

## 核心结构

$$y=F(x)+x$$

```mermaid
flowchart LR
  X[x] --> F[F(x)]
  X --> A[Add]
  F --> A
  A --> Y[y]
```

Identity Path 同时是信息路径和梯度路径。反向传播时：

$$\frac{\partial y}{\partial x}=\frac{\partial F}{\partial x}+I$$

即使 `F` 的局部梯度很小，恒等项仍提供直接通道。

## Shape / 数据流

相加要求 `F(x)` 与 `x` Shape 相同。如果通道数或空间大小变化，需要用 Projection Shortcut 对齐：

```text
x       : [B, C_in, H, W]
F(x)    : [B, C_out, H/2, W/2]
proj(x) : [B, C_out, H/2, W/2]
```

## Python 实验

```python exec lab="residual-gradient-flow" cell="1" title="构造普通与残差网络"
import torch
torch.manual_seed(1)
depth, width = 24, 32
plain = torch.nn.ModuleList([torch.nn.Linear(width, width, bias=False) for _ in range(depth)])
residual = torch.nn.ModuleList([torch.nn.Linear(width, width, bias=False) for _ in range(depth)])
```

```python exec lab="residual-gradient-flow" cell="2" title="比较输入梯度"
def grad_norm(layers, use_residual):
    x = torch.randn(1, width, requires_grad=True)
    h = x
    for layer in layers:
        update = torch.tanh(layer(h))
        h = h + 0.1 * update if use_residual else update
    h.sum().backward()
    return x.grad.norm().item()
print("plain:", grad_norm(plain, False))
print("residual:", grad_norm(residual, True))
```

## 与前后模型的关系

GRU 也在旧状态和候选更新之间建立受控路径，Transformer Block 也使用 Residual Connection。不过它们的数学机制不同，只共享“保留旧表示并学习更新量”的信息流思想。

## 我现在需要记住什么

残差连接同时改变函数表达方式、信息传递方式和梯度路径。它不是简单把两个 Tensor 相加的技巧。
