---
id: first-lab
title: First lab
section: Module 1 / Experiments
order: 20
tags: [python, experiment, module-1]
aliases: []
prerequisites: [first-concept]
summary: 使用 Python 标准库运行可重复的多 Cell 实验并解释观察结果。
status: seed
---

# First lab

## 实验目标

验证固定随机种子能让抽样实验保持可重复，并区分原始观察与解释。

```python exec lab="first-lab" cell="1" title="Create deterministic samples" difficulty="basic"
from random import Random

rng = Random(7)
samples = [rng.random() for _ in range(8)]
print("samples:", [round(value, 4) for value in samples])
```

```python exec lab="first-lab" cell="2" title="Summarize and verify" difficulty="basic"
sample_mean = sum(samples) / len(samples)
print("mean:", round(sample_mean, 4))
assert len(samples) == 8
assert 0.0 <= sample_mean <= 1.0
```

## 观察与解释

记录实际输出、它支持的结论，以及不能由这次实验推出的结论。改变种子后重新运行，再比较差异。
