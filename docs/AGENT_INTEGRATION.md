# TensorNote 智能体接口

`skills/tensornote-knowledge-workspace/` 是可独立分发的知识库维护 Skill。它使用 Workspace Schema v1、普通 Markdown 与 Sidecar v2 指令，不定义私有数据库或第二种文件格式。

## 交给智能体什么

把完整 Skill 目录以及明确的 Workspace 根目录交给智能体。不要只复制 `SKILL.md`，因为 references、templates 和 Validator 都是接口的一部分。

智能体可以创建、更新、移动、审查笔记和资源，维护 Frontmatter、WikiLink、Derivation/Jupyter Sidecar，并运行确定性验证。它不会因此自动获得安装依赖、执行代码、联网、推送 Git 或处理凭证的权限。

## 安装与验证

```sh
cd tensornote-knowledge-workspace
npm ci --ignore-scripts
node scripts/validate-workspace.mjs "/absolute/path/to/workspace"
node scripts/validate-workspace.mjs "/absolute/path/to/workspace" --strict
node scripts/validate-workspace.mjs "/absolute/path/to/workspace" --json
```

普通模式报告质量警告，strict 将警告也视为失败，JSON 输出适合 Agent/CI 消费。运行 Validator 不需要 TensorNote 或 Jupyter。

调用示例：

> 使用 tensornote-knowledge-workspace Skill 更新 `/path/to/my-workspace`。保留目录结构与现有 ID，为注意力缩放补充 Derivation Sidecar 和一个 CPU 安全的 Jupyter Sidecar，然后执行 strict 校验。
