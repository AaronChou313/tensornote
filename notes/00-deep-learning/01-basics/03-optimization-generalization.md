---
id: optimization-generalization
title: 优化与泛化
section: Deep Learning / 基础
order: 3
tags: [sgd, adam, learning-rate, overfitting, regularization]
prerequisites: [loss-backpropagation]
summary: 区分找到低训练误差与在未见数据上保持有效这两个问题。
---

# 优化与泛化

## 这一节解决什么问题

训练 Loss 下降是否等于模型真的学会了？不等于。这里需要区分优化（Optimization）与泛化（Generalization）。

## 一句话理解

- 优化问：怎样找到训练目标下更好的参数？
- 泛化问：为什么这些参数在没见过的数据上仍然有效？

## 核心结构

Gradient Descent 的更新是：

$$\theta_{t+1}=\theta_t-\eta\nabla_\theta L$$

`η` 是 Learning Rate。Mini-batch SGD 用一小批样本估计梯度，Momentum 累积方向，Adam 进一步按参数估计一阶与二阶矩。

| 方法 | 主要作用 | 风险 |
|---|---|---|
| Learning Rate | 控制步长 | 太大震荡，太小收敛慢 |
| Momentum | 平滑并积累方向 | 动量过强可能越过谷底 |
| Adam | 自适应每个参数的尺度 | 不保证一定泛化更好 |

## 泛化工具

L2 限制过大的权重，Dropout 随机移除部分激活，Data Augmentation 扩展输入变化。它们的共同目标不是让训练集更容易拟合，而是限制模型依赖脆弱模式。

> [!pitfall]
> 训练 Loss 继续下降而验证 Loss 上升，是 Overfitting 的典型信号，不是优化器还不够强。

## Python 实验

```python exec lab="learning-rate-loss-curves" cell="1" title="准备二维分类数据"
import torch
import matplotlib.pyplot as plt
torch.manual_seed(4)
X = torch.randn(120, 2)
y = ((X[:, 0] + 0.7 * X[:, 1]) > 0).float().unsqueeze(1)
print(X.shape, y.shape)
```

```python exec lab="learning-rate-loss-curves" cell="2" title="比较 Learning Rate"
curves = {}
for lr in [0.01, 0.1, 1.0]:
    W = torch.zeros(2, 1, requires_grad=True)
    losses = []
    for _ in range(50):
        pred = torch.sigmoid(X @ W)
        loss = torch.nn.functional.binary_cross_entropy(pred, y)
        loss.backward()
        with torch.no_grad(): W -= lr * W.grad
        W.grad.zero_()
        losses.append(loss.item())
    curves[lr] = losses
for lr, values in curves.items(): plt.plot(values, label=f"lr={lr}")
plt.xlabel("step"); plt.ylabel("loss"); plt.legend(); plt.show()
```

## 我现在需要记住什么

优化描述训练过程，泛化描述模型在新数据上的行为。两者相关，但不能用一个训练 Loss 代替全部判断。
