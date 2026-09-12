# TensorNote 2.0 发行

正式产品包含 Web 与 Desktop。

- Web：`pnpm build:web` 生成静态部署；Release 附带 `TensorNote-web-X.Y.Z.tar.gz`。GitHub Pages 和自托管容器使用同一 Web Host 能力。
- Desktop：Tauri 为 macOS、Windows、Linux 构建安装包。社区包可在没有付费商店账号时通过 GitHub Release 分发；Apple Developer ID 公证与 Windows 可信发布者签名取决于维护者证书。
- Agent Skill：`pnpm package:skill` 生成与同版本契约匹配的压缩包。

浏览器开发服务器不打包为 Local Web Edition。发行不含 Git Bridge。Tag 发布流水线执行 Web、Desktop、容器证明、校验与 SHA256SUMS。
