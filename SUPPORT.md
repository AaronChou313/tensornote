# TensorNote Support

## 先从这里开始

1. 安装、Conda/venv/uv、Jupyter 与每日启动：[`docs/ENVIRONMENT_SETUP.md`](docs/ENVIRONMENT_SETUP.md)
2. Pane、Tabs、编辑器和命令：[`docs/WORKBENCH.md`](docs/WORKBENCH.md)
3. Compute Profile 与连接诊断：[`docs/COMPUTE_PLATFORM.md`](docs/COMPUTE_PLATFORM.md)
4. 草稿、冲突与恢复：[`docs/RECOVERY.md`](docs/RECOVERY.md)
5. Git Bridge：[`docs/GIT_AND_SYNC.md`](docs/GIT_AND_SYNC.md)

## 提交问题

如果文档不能解决问题，请创建 [GitHub Issue](https://github.com/AaronChou313/tensornote/issues/new/choose)。一份可处理的报告应包含：

- TensorNote 版本或 Commit SHA；
- 浏览器、操作系统与部署方式；
- Workspace 来源（Local/Built-in/GitHub）和是否只读；
- 最短复现步骤、预期结果与实际结果；
- 已运行的诊断和无敏感信息的截图/错误文本。

Jupyter 问题还应说明 Server URL 的主机与端口、Kernel Name、诊断停在哪一步；请删除 Token。Git Bridge 问题请说明仓库状态和 Bridge 健康信息，不要附私有 Diff。

功能建议应描述用户任务、当前阻碍和最小可用结果，而不只是指定某个 UI 组件。稳定平台契约变更请同时说明兼容与迁移影响。

## 不适合公开 Issue 的内容

- 可利用的安全漏洞：按 [`SECURITY.md`](SECURITY.md) 私密报告。
- Jupyter Token、扩展 Secret、私有仓库地址或个人知识内容。
- 紧急 SLA、托管服务或一对一环境代配置；项目当前不承诺商业支持。
