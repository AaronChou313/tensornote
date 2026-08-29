---
id: convolution
title: Convolution
section: Deep Learning / CNN
order: 1
tags: [cnn, convolution, kernel, feature-map, shape]
prerequisites: [neural-network]
summary: 把卷积理解为在局部感受野中重复寻找可学习模式。
---

# Convolution

## 这一节解决什么问题

图片的像素具有二维邻接结构。如何在不为每个位置学习独立参数的情况下，稳定地检测局部模式？

## 一句话理解

> [!intuition]
> 卷积是在每个局部感受野中使用同一组 Kernel 参数寻找特定模式。

## 核心结构

Kernel 在图像上滑动，每个位置做逐元素乘法与求和。共享同一 Kernel 意味着同一种边缘或纹理可以在不同位置被检测。

输出空间尺寸为：

$$H_{out}=\left\lfloor\frac{H+2P-K}{S}\right\rfloor+1$$

其中 `K` 是 Kernel Size，`S` 是 Stride，`P` 是 Padding。

## 多通道与 Shape

```text
Input  : [B, C_in, H, W]
Weight : [C_out, C_in, K, K]
Output : [B, C_out, H_out, W_out]
```

每个输出通道拥有一组跨越全部输入通道的 Kernel。通道内先卷积，再沿输入通道求和。

## Python 实验

```python exec lab="convolution-from-scratch" cell="1" title="NumPy 手写二维卷积"
import numpy as np
image = np.arange(25, dtype=np.float32).reshape(5, 5)
kernel = np.array([[1, 0, -1], [1, 0, -1], [1, 0, -1]], dtype=np.float32)
out = np.empty((3, 3), dtype=np.float32)
for i in range(3):
    for j in range(3):
        out[i, j] = np.sum(image[i:i+3, j:j+3] * kernel)
print(out)
```

```python exec lab="convolution-from-scratch" cell="2" title="使用 torch Conv2d 对比"
import torch
conv = torch.nn.Conv2d(1, 1, kernel_size=3, bias=False)
with torch.no_grad(): conv.weight.copy_(torch.tensor(kernel)[None, None])
torch_out = conv(torch.tensor(image)[None, None]).squeeze().detach().numpy()
print(torch_out)
print("max difference:", np.abs(out - torch_out).max())
```

## 我现在需要记住什么

卷积的关键不是图片专属魔法，而是局部连接、参数共享和空间结构。Kernel 学到的是要寻找的模式。
