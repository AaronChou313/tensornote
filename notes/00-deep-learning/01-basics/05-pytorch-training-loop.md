---
id: pytorch-training-loop
title: PyTorch Training Loop
section: Deep Learning / 基础
order: 5
tags: [pytorch, tensor, module, optimizer, training-loop]
prerequisites: [loss-backpropagation, optimization-generalization]
summary: 用一条训练循环把 Module、Loss、autograd 和 optimizer 串成完整系统。
---

# PyTorch Training Loop

## 这一节解决什么问题

PyTorch 的 API 很多，但训练的主循环始终围绕同一条数据流展开。

## 一句话理解

每个 Batch 都经历预测、衡量错误、清理旧梯度、计算新梯度和更新参数。

## 核心结构

```python
for X, y in dataloader:
    pred = model(X)
    loss = criterion(pred, y)
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
```

| 语句 | 发生的事情 |
|---|---|
| `model(X)` | 调用 `forward` 构建计算图 |
| `criterion` | 把预测和目标压缩成优化目标 |
| `zero_grad()` | 清除上一步累积的梯度 |
| `backward()` | 用链式法则填充参数的 `.grad` |
| `step()` | 优化器读取梯度并修改参数 |

## Shape / 数据流

```text
X       : [B, d_in]
pred    : [B, d_out]
y       : [B, d_out]
loss    : []
W.grad  : same shape as W
```

## Python 实验

```python exec lab="minimal-pytorch-training-loop" cell="1" title="建立模型与数据"
import torch
torch.manual_seed(5)
X = torch.randn(64, 3)
true_w = torch.tensor([[2.0], [-1.0], [0.5]])
y = X @ true_w + 0.1 * torch.randn(64, 1)
model = torch.nn.Linear(3, 1)
optimizer = torch.optim.SGD(model.parameters(), lr=0.1)
criterion = torch.nn.MSELoss()
```

```python exec lab="minimal-pytorch-training-loop" cell="2" title="运行训练循环"
for step in range(40):
    pred = model(X)
    loss = criterion(pred, y)
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
    if step % 10 == 0: print(step, round(loss.item(), 5))
print("learned weight:", model.weight.detach())
```

## 我现在需要记住什么

`Module` 定义可学习函数，autograd 计算梯度，optimizer 使用梯度。读任何训练代码时，先找出这五步再理解工程细节。
