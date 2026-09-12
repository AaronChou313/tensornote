# TensorNote 2.0 架构

```text
React Workbench
├── Workspace Session → WorkspaceProvider → Markdown/assets/tensornote.yaml
├── Knowledge Index → WikiLink / Heading / Search
├── Note Surface → Reader / Editor / Properties / Outline
└── SidePanel
    ├── Derivation → safe Markdown renderer
    └── Jupyter → ComputeRuntime → ComputeConnector → ComputeProvider

HostAdapter
├── Web
└── Desktop → native workspace + local runtime assistance
```

Host 只描述 Web 或 Desktop 能力。Web deployment metadata 只描述 development/static/self-hosted、Router、base path 与 PWA。

Workspace Provider 和 Compute Provider 是稳定边界。UI 不根据具体来源硬编码能力。Markdown parser 提取 Sidecar，同时保留旧 Lab adapter；错误指令原文降级。Settings/Secret、草稿、运行状态与 Workspace 内容分开保存。

2.0 不含 Extension Platform、Command Registry、Structured Database、Graph UI、Git Workspace 或 Project Experiment。完整约束见 [PLATFORM_CONTRACTS.md](PLATFORM_CONTRACTS.md)。
