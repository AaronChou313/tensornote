# 发布 TensorNote Workspace

TensorNote v1.4.0 可以把一个公开 GitHub Workspace 发布为无需安装的只读知识产品。发布站点仍运行 TensorNote 的 Static Web Runtime，Markdown、Assets、`tensornote.yaml` 与环境文件继续留在作者自己的 Repository；TensorNote 不建立内容副本或托管 Token。

## 1. 发布前准备

公开 Repository 至少应包含：

```text
my-course/
├── .github/workflows/publish-tensornote.yml
├── LICENSE
├── tensornote.yaml
├── notes/
├── assets/
└── requirements.txt        # 可选，但声明后必须存在
```

在 `tensornote.yaml` 中增加兼容 Schema v1 的可选展示信息：

```yaml
publishing:
  title: Practical Transformer Notes
  description: 从注意力机制到可运行实验的学习路径
  logo: assets/logo.png
  accent: '#4f8061'
  defaultNote: start-here
```

- `title`、`description` 与 `defaultNote` 是发布候选必填项。
- `defaultNote` 使用笔记 Frontmatter 的稳定 `id`，不是文件路径。
- `logo` 必须是 Workspace 内安全的相对路径；不得使用绝对路径或 `..`。
- `accent` 必须是六位十六进制颜色。深色主题仍保持 TensorNote 的可读性基线。
- 根目录必须有非空 `LICENSE` 或 `COPYING`。知识库的许可证由作者选择，不会自动继承 TensorNote 的 Apache-2.0。

## 2. 一次复制完成 GitHub Pages Workflow

复制 Skill 中的模板：

```bash
mkdir -p .github/workflows
cp /path/to/tensornote/skills/tensornote-knowledge-workspace/assets/publish-tensornote.yml \
  .github/workflows/publish-tensornote.yml
```

也可以直接复制模板文件内容。随后在 GitHub Repository 的 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**，推送到 `main`。Workflow 会：

1. 分别检出知识库与 TensorNote Runtime；
2. 对知识库执行严格 Workspace 校验与发布前检查；
3. 把当前 `${GITHUB_SHA}` 写入 Static 构建；
4. 构建同一套 TensorNote Web Runtime；
5. 上传并部署 Pages Artifact。

v1.6.0 模板把 Workflow 的 `uses` 与 `runtime_ref` 固定到相同 TensorNote Tag，避免应用 Runtime 随 `main` 漂移。升级 Runtime 时应同时修改这两个值，并先在 Fork 或独立分支运行发布检查。

## 3. 本地运行发布检查

```bash
pnpm validate:publication -- \
  --workspace /absolute/path/to/workspace \
  --owner github-owner \
  --repo repository-name \
  --revision 0123456789abcdef0123456789abcdef01234567
```

检查会阻止：

- 非完整 Git commit revision；
- 不符合严格模式的 Workspace；
- 缺少标题、描述、首页、Logo 或环境文件；
- 缺少或为空的 License；
- `.env`、`.npmrc`、私钥等明显凭据文件。

检查器只读取候选目录，不执行 Python、不安装 Workspace 依赖、不启动 Jupyter，也不修改 Git。

## 4. 分享与阅读

打开 GitHub Workspace 后，点击顶部的分享图标：

- **可复现阅读链接**固定为 `owner/repository@commitSHA`，还可固定当前笔记 ID。
- **Repository** 显示真实来源和 License。
- **Fork** 创建读者自己的 Repository 副本。
- **Download** 下载当前 commit 的源码归档。
- **Open in Desktop** 使用受限 `tensornote://open/github/...` 深链；只有已安装并注册 TensorNote Desktop 时生效。
- **Badge** 可复制到 Workspace README。
- **Workspace v1 Badge** 声明 Schema、执行授权和可移植 Markdown 兼容边界。

公开内容始终按 GitHub Provider 的只读能力显示。Python 代码不会因为公开而自动执行：作者需要声明 `features.executable: true`，读者需要自己的 Compute Profile，并且必须在本机信任当前 commit revision。

## 5. Desktop 深链安全边界

Desktop 只接受以下形状：

```text
tensornote://open/github/<owner>/<repository>?ref=<full-commit-sha>&note=<optional-note-id>
```

它拒绝分支名、不完整 SHA、其他协议、任意本地路径与命令。打开不同 Workspace 前仍检查未保存的笔记和 Lab；深链只负责选择公开 GitHub 内容，不携带 Jupyter Token、执行授权或扩展 Secret。

## 6. 自定义域名

复用 Workflow 时可以传入 `public_url`，值必须是包含尾部 `/` 的真实公开 Reader 根地址。默认值为 `https://<owner>.github.io/<repository>/`。自定义域名还需要按 GitHub Pages 文档配置 DNS 与 Repository Pages 设置；TensorNote 不管理 DNS 或证书。
