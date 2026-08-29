---
id: embedding-evolution
title: Embedding 的演化
section: Deep Learning / RNN
order: 5
tags: [embedding, word2vec, elmo, contextual-representation]
prerequisites: [sequence-and-rnn]
summary: 从稀疏词频向量走向上下文相关表示，理解 Embedding Matrix 为什么是可学习参数。
---

# Embedding 的演化

## 这一节解决什么问题

文字本身不是连续数值。怎样把 Token 转成既可计算、又能表达语义的向量？

## 一句话理解

Embedding 把离散 ID 映射到连续空间，训练目标迫使有相似作用的 Token 获得相近表示。

## 表示路线

```mermaid
flowchart LR
  O[One-hot] --> B[Bag of Words]
  B --> N[N-gram]
  N --> W[Word2Vec / GloVe]
  W --> E[ELMo]
  E --> T[Transformer]
```

Bag of Words 是高维稀疏词频向量，忽略顺序。N-gram 加入局部顺序，但组合数量快速增长。

## Word2Vec 与 Embedding Matrix

$$E\in\mathbb{R}^{V\times d}$$

`V` 是词表大小，`d` 是向量维度。`word → index → E[index]` 是一次查表，E 本身是训练出来的参数。

CBOW 用上下文预测中心词，Skip-gram 用中心词预测上下文。两种目标都让经常出现在相似上下文中的词靠近。

## 从静态到上下文表示

Word2Vec 中一个词只有一个固定向量。ELMo 让同一词经过双向语言模型后得到上下文相关表示，因此 `river bank` 与 `bank account` 中的 bank 可以不同。

Transformer 把上下文表示推进到更通用的 Token 关系建模。

## Python 实验

```python exec lab="tiny-embedding-space" cell="1" title="从 ID 查 Embedding"
import torch
torch.manual_seed(8)
vocab = {"cat": 0, "dog": 1, "car": 2, "road": 3}
embedding = torch.nn.Embedding(num_embeddings=4, embedding_dim=3)
ids = torch.tensor([vocab["cat"], vocab["dog"]])
vectors = embedding(ids)
print(ids, vectors.shape)
print(vectors)
```

```python exec lab="tiny-embedding-space" cell="2" title="计算 Cosine Similarity"
all_vectors = embedding.weight
similarity = torch.nn.functional.cosine_similarity(all_vectors[:, None, :], all_vectors[None, :, :], dim=-1)
print(similarity)
```

## 我现在需要记住什么

Embedding 不是固定编码规则，而是一张可训练参数表。上下文模型进一步让最终表示依赖当前句子，而不只依赖 Token ID。
