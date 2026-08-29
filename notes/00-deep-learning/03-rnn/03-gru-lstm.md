---
id: gru-lstm
title: GRU 与 LSTM
section: Deep Learning / RNN
order: 3
tags: [gru, lstm, gate, cell-state, residual]
prerequisites: [bptt, resnet]
summary: 从“保留、忘记、更新”的信息流理解门控循环网络。
---

# GRU 与 LSTM

## 这一节解决什么问题

Vanilla RNN 每一步都用一个新候选值重写隐藏状态。怎样让网络主动决定哪些信息保留更久？

## 一句话理解

Gate 是数据依赖的软开关，让模型学习何时保留旧状态，何时写入新信息。

## GRU 核心结构

GRU 包含 Reset Gate、Update Gate 和 Candidate State。最重要的更新式是：

$$h_t=(1-z_t)h_{t-1}+z_t\tilde h_t$$

当 `z_t≈0`，状态主要保留旧值；当 `z_t≈1`，状态主要采用候选值。

> [!bridge]
> ResNet 使用 `旧表示 + learned residual`，GRU 使用 `旧状态与候选状态的门控混合`。二者不是同一模型，但都建立了更稳定的信息路径。

## LSTM 核心结构

LSTM 将 Cell State `C_t` 与 Hidden State `h_t` 分开：

- Forget Gate 决定旧 Cell 保留多少。
- Input Gate 决定写入多少候选信息。
- Output Gate 决定 Cell 的哪些内容成为当前输出。

$$C_t=f_t\odot C_{t-1}+i_t\odot\tilde C_t$$

Cell State 提供了一条加法式更新路径，比反复完全重写状态更适合保存长期信息。

## Shape / 数据流

```text
x_t             : [B, d_in]
h_{t-1}, C_{t-1}: [B, d_hidden]
gate values     : [B, d_hidden]
h_t, C_t        : [B, d_hidden]
```

## Python 实验

```python exec lab="simplified-gru-gate" cell="1" title="构造旧状态与候选状态"
import torch
h_old = torch.tensor([[1.0, -1.0, 0.5]])
h_candidate = torch.tensor([[-0.5, 0.8, 2.0]])
print("old:", h_old)
print("candidate:", h_candidate)
```

```python exec lab="simplified-gru-gate" cell="2" title="观察 Update Gate"
for z in torch.linspace(0, 1, 6):
    h_new = (1 - z) * h_old + z * h_candidate
    print(f"z={z:.1f}", h_new)
```

## 容易混淆的地方

Gate 接近 0 或 1 是便于理解的极端情况，真实训练中通常是连续值。GRU 更简洁，LSTM 状态分工更明确，不能脱离任务直接断言谁一定更好。

## 我现在需要记住什么

门控结构的重点不是背公式，而是跟踪旧信息路径、候选信息路径以及它们如何被数据依赖地混合。
