---
id: bptt
title: BPTT 与长序列梯度
section: Deep Learning / RNN
order: 2
tags: [bptt, vanishing-gradient, exploding-gradient, sequence]
prerequisites: [sequence-and-rnn, loss-backpropagation]
summary: 展开时间维，观察共享 recurrent weight 如何反复进入梯度链。
---

# BPTT 与长序列梯度

## 这一节解决什么问题

RNN 能保存过去，但为什么普通 RNN 很难学到长距离依赖？

## 一句话理解

Backpropagation Through Time 把循环展开成深计算图，同一 recurrent weight 在梯度路径中被反复相乘。

## 核心结构

```text
h0 → h1 → h2 → h3 → h4
     W    W    W    W
```

简化地看，早期状态对后期 Loss 的影响含有：

$$\frac{\partial h_T}{\partial h_0}=\prod_{t=1}^{T}\frac{\partial h_t}{\partial h_{t-1}}$$

如果这些 Jacobian 的尺度长期小于 1，梯度消失；长期大于 1，梯度爆炸。`tanh` 的饱和还会进一步缩小局部梯度。

## Shape / 数据流

参数 `W_hh:[D,D]` 在每个时间步共享，但每个时间步都有不同的中间状态 `h_t:[B,D]`。BPTT 累加所有时间步对同一参数的梯度贡献。

## Python 实验

```python exec lab="rnn-gradient-length" cell="1" title="定义梯度测量"
import torch
def input_gradient(sequence_length, recurrent_scale):
    x0 = torch.ones(1, requires_grad=True)
    h = x0
    for _ in range(sequence_length):
        h = torch.tanh(recurrent_scale * h)
    h.backward()
    return abs(x0.grad.item())
```

```python exec lab="rnn-gradient-length" cell="2" title="比较序列长度与权重"
for scale in [0.5, 0.9, 1.2]:
    values = [input_gradient(length, scale) for length in [2, 5, 10, 20]]
    print(scale, values)
```

> [!important]
> Gradient Clipping 能限制爆炸梯度，但不能从根本上让消失的长期信息重新出现。

## 我现在需要记住什么

BPTT 不是新的优化器，而是把链式法则应用到展开的时间计算图。长路径导致了 Vanilla RNN 的核心困难。
