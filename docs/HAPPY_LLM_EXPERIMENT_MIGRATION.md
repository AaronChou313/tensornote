# Happy-LLM Project Experiment 迁移表

试点为外部 `happy-llm-tensornote` Workspace；TensorNote 应用仓库不直接改写该目录。

| 章节 | 内容 | Runner | 环境 | 推荐预设 |
| --- | --- | --- | --- | --- |
| 5 | 数据处理、Tokenizer | python | base / tokenizer | prepare-dataset / tokenizer-cpu |
| 5 | 预训练、SFT | torchrun | training / distributed | pretrain-smoke / pretrain-ddp / sft-full |
| 5 | 模型导出 | python | training | export-model |
| 6 | 数据与模型下载 | python | base / training | download-assets |
| 6 | 数据处理 | notebook | notebook | process-dataset |
| 6 | 预训练与微调 | python / torchrun | training / distributed | pretrain-smoke / finetune-single / finetune-deepspeed |

依赖拆为 `requirements-base.txt`、`requirements-tokenizer.txt`、`requirements-training.txt`、`requirements-distributed.txt` 与 `requirements-notebook.txt`。原 `requirements.txt` 在迁移期保留兼容入口。Shell 下载脚本不进入 v1 Runner，先提供等价的受参数约束 Python 步骤。

首批验收覆盖第 5 章 Tokenizer CPU、第 5 章单 epoch 预训练、第 6 章数据处理和第 6 章单卡微调。每个重型预设必须有轻量 smoke、资源说明、下载来源、许可、大小和缓存位置，且普通命令行流程继续可用。
