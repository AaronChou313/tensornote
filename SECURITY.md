# Security Policy

TensorNote 会连接本地文件、Jupyter Server、可选 Git Bridge 与本地扩展。安全问题可能影响用户代码执行、文件内容、凭据或浏览器边界，因此请负责任地报告。

## 支持范围

安全修复优先应用于当前 `main` 与最近正式 Release。旧的实验版本可能只提供升级建议；未来 Workspace Schema 会保留只读能力，并默认关闭写入和执行。

## 私密报告

请使用 GitHub 的 [Private vulnerability reporting](https://github.com/AaronChou313/tensornote/security/advisories/new) 提交：

- 受影响版本与部署模式；
- 可重复的最小步骤或概念验证；
- 预期影响和已知前置条件；
- 建议修复（如有）。

不要在公开 Issue 中发布可直接利用的细节、Token、Secret、私有 Workspace 内容或真实用户数据。维护者会确认报告、复现问题、评估影响，并在修复可用后协调披露；在完成评估前请保留私密性。

## 重点边界

- Jupyter Token 与 Extension Secret 不应写入 Workspace、Git、日志或恢复草稿。
- `features.executable: true` 不是自动执行许可；仍需要用户连接 Compute Profile，GitHub 来源还需要信任当前 Revision。
- Git Bridge 固定 Workspace 根目录并使用参数化进程调用，不提供任意 Shell 或远程凭据管理。
- 本地扩展在用户确认 Manifest 与权限前不得激活。
- HTTPS 页面连接 HTTP Jupyter 会受浏览器 Mixed Content 策略限制，这不是应绕过的安全检查。

依赖漏洞、权限绕过、路径穿越、跨 Workspace 数据泄漏、未授权执行和 Secret 持久化问题都属于本策略范围。一般使用问题请按 [`SUPPORT.md`](SUPPORT.md) 反馈。
