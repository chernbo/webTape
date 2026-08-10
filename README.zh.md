<div align="center">

# 📺 Web Tape

**页面会话录制与回放。** 一行代码即可录制用户操作、网络请求与控制台日志，
再配合时间轴回放、批注沟通、cURL 复现与 AI 摘要——彻底告别「无法复现」。

[English](./README.md) · 简体中文

[![npm](https://img.shields.io/npm/v/@webtapejs/toolbox.svg)](https://www.npmjs.com/package/@webtapejs/toolbox)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

[文档](https://webtape.chenb.xyz/) · [npm](https://www.npmjs.com/package/@webtapejs/toolbox)

</div>

---

## ✨ 特性

- 🚨 **哨兵模式** —— 监听 HTTP 4xx/5xx，命中时提示一键上报。
- 🔁 **后台滑动窗口** —— 始终在内存保留最近 N 秒，出问题也能事后回溯，无需提前开录。
- 🌐 **全量采集** —— 页面操作、网络请求、控制台日志汇入同一事件流。
- 🎚️ **丰富回放** —— 拖拽进度条、键盘快捷键、画面批注、网络/控制台面板、cURL 复制与 AI 摘要。
- 🌓 **主题与多语言** —— 明暗主题、中英文，运行时可切换。
- 🧩 **零业务侵入** —— 一次 `import` 或一行 `<script>` 即可接入，SDK 完全隔离。

## 📦 安装

```bash
npm install @webtapejs/toolbox
# 或：pnpm add @webtapejs/toolbox / yarn add @webtapejs/toolbox
```

也可通过 CDN 引入，无需构建：

```html
<script src="https://unpkg.com/@webtapejs/toolbox/dist/web-tape.iife.js"></script>
```

## 🔨 使用

```ts
import { configure, mountFab } from '@webtapejs/toolbox'

configure({
  serverUrl: 'https://your-replayer.example.com/api/replayer', // 你的回放服务（见下）
  autoBackgroundRecord: true,
  errorPrompt: true,   // 哨兵模式
  locale: 'zh',        // 注入 UI 语言：'en'（默认）| 'zh'
})

mountFab() // 可选：挂载内置悬浮录制按钮
```

> 录制上传与回放需要一个**回放服务**。装了 Docker 后一行命令自建：
>
> ```bash
> curl -fsSL https://raw.githubusercontent.com/chernbo/webTape/main/deploy/install.sh | bash
> ```
>
> 会拉起 MySQL + 回放服务在 `http://localhost:3100`，把 `http://localhost:3100/api/replayer` 作为 `serverUrl`。上传接口默认不鉴权（Web Tape 是寄生在宿主应用内运行的伴随工具，而非独立服务）——若需公网暴露请在网关层自行加鉴权。

完整 API、配置与指南见 **[文档站](https://webtape.chenb.xyz/)**。

## 🔗 链接

- 📖 **文档**：https://webtape.chenb.xyz/
- 📦 **npm**：[`@webtapejs/toolbox`](https://www.npmjs.com/package/@webtapejs/toolbox)
- 🧩 **SDK 说明**：[`packages/toolbox`](./packages/toolbox#readme)

## ⌨️ 开发

本仓库是 pnpm monorepo（`packages/toolbox` —— SDK · `apps/replayer` —— 回放应用）。

```bash
pnpm install
# SDK：     cd packages/toolbox && pnpm dev
# 回放应用： cd apps/replayer && pnpm dev   # http://localhost:3100
```

## 📄 许可

[MIT](./LICENSE) · 基于 [rrweb](https://github.com/rrweb-io/rrweb) ❤️ 构建，特别感谢 rrweb 团队。
