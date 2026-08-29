---
id: zero-shot
title: CLIP Zero-Shot Classification
section: CLIP
order: 3
tags: [zero-shot, prompt, classifier, similarity]
prerequisites: [contrastive-learning]
summary: 用类别文本生成动态分类权重，通过图文相似度完成未专门训练的分类任务。
---

# CLIP Zero-Shot Classification

## 这一节解决什么问题

CLIP 没有为某个固定类别集训练分类头，为什么还能识别 dog、cat、car 等类别？

## 一句话理解

把类别写成自然语言 Prompt，Text Encoder 产生类别表示，Image Embedding 与哪个类别表示最相似就预测哪个类别。

## 核心结构

```text
"a photo of a dog" → Text Encoder → z_dog
"a photo of a cat" → Text Encoder → z_cat
"a photo of a car" → Text Encoder → z_car

Image → Image Encoder → z_image
```

把类别向量堆成 `[K,D]`，图片向量 `[B,D]` 与其转置相乘得到 `[B,K]` 分类 Logits。

> [!intuition]
> 传统分类器的每个类别权重是训练参数。CLIP 的类别权重可以由自然语言描述动态产生。

## Prompt 的作用

类别名本身可能过短或有歧义。`a photo of a {class}` 等模板提供与预训练图文描述更相近的上下文。多个模板的表示还可以平均。

## Optional / Heavy Lab

下面实验需要 `transformers`、`torch`、`Pillow`，并会下载模型。基础理解不依赖它。

```python exec lab="clip-zero-shot-optional" cell="1" title="加载 Hugging Face CLIP" difficulty="heavy"
from transformers import CLIPModel, CLIPProcessor
from PIL import Image
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
print("model loaded")
```

```python exec lab="clip-zero-shot-optional" cell="2" title="比较图片与类别 Prompt" difficulty="heavy"
image = Image.new("RGB", (224, 224), color="gray")
labels = ["a photo of a dog", "a photo of a cat", "a photo of a car"]
inputs = processor(text=labels, images=image, return_tensors="pt", padding=True)
outputs = model(**inputs)
print(outputs.logits_per_image.softmax(dim=-1))
```

## 我现在需要记住什么

Zero-Shot Classification 把自然语言类别描述变成分类器表示。Prompt 改变类别的语义上下文，因此会影响结果。
