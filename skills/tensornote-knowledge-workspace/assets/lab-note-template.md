---
id: executable-concept
title: Executable concept
section: Subject / Experiments
order: 1
tags: [python, experiment]
aliases: []
prerequisites: []
summary: 通过一个可重复的多 Cell 实验验证核心概念。
status: seed
---

# Executable concept

## 实验目标

说明要验证的假设、输入和预期观察。

```python exec lab="executable-concept" cell="1" title="Prepare deterministic input" difficulty="basic"
import numpy as np

rng = np.random.default_rng(7)
x = rng.normal(size=(4, 3))
print("x.shape:", x.shape)
```

```python exec lab="executable-concept" cell="2" title="Verify the invariant" difficulty="basic"
centered = x - x.mean(axis=0, keepdims=True)
print("column means:", centered.mean(axis=0).round(8))
assert np.allclose(centered.mean(axis=0), 0.0)
```

## 观察与解释

解释输出如何支持或反驳实验目标。

## 我现在需要记住什么

- 记录由实验直接支持的结论。
