# @webtapejs/toolbox

[Web Tape](https://github.com/chernbo/webTape) 的**采集端**——基于 [rrweb](https://github.com/rrweb-io/rrweb) 的轻量浏览器录制 SDK。一次 `import` 或一行 `<script>` 即可录制页面操作、网络请求与控制台日志，内置后台滑动窗口、最近 N 秒一键回溯，以及接口异常哨兵模式。

[English](./README.md) · 简体中文

[![npm](https://img.shields.io/npm/v/@webtapejs/toolbox.svg)](https://www.npmjs.com/package/@webtapejs/toolbox)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

## ✨ 特性

- 🚨 **哨兵模式** —— 监听 HTTP 4xx/5xx，命中时提示一键上报。
- 🔁 **后台滑动窗口** —— 始终在内存保留最近 N 秒（默认 30s）。
- ⏪ **一键回溯** —— 出问题时直接上传最近现场，无需提前开录。
- 🌐 **全量采集** —— XHR 拦截 + rrweb 控制台插件，汇入同一事件流。
- 🔘 **内置悬浮按钮** —— 可选的悬浮录制按钮，带二次确认与时长保护。
- 🌍 **多语言** —— 注入 UI 默认英文，可切中文。

## 📦 安装

```bash
npm install @webtapejs/toolbox
# 或：pnpm add @webtapejs/toolbox / yarn add @webtapejs/toolbox
```

## 🔨 使用

```ts
import { configure, mountFab } from '@webtapejs/toolbox'

configure({
  serverUrl: 'https://your-replayer.example.com/api/replayer', // 必填
  autoBackgroundRecord: true,
  errorPrompt: true,   // 哨兵模式
  locale: 'zh',        // 'en'（默认）| 'zh'
})

mountFab() // 可选：内置悬浮按钮；不调则由你自渲染 UI
```

npm 入口**无副作用**——不调用就什么都不会跑。

零代码 CDN 引入（加载即自动挂 FAB + 后台录制）：

```html
<script src="https://unpkg.com/@webtapejs/toolbox/dist/web-tape.iife.js"></script>
<script>
  window._webTape.configure({ serverUrl: 'https://your-replayer.example.com/api/replayer' })
</script>
```

> 加 `data-builtin-fab="false"` 可静默不挂 FAB；加 `data-locale="zh"` 切中文。
> 录制数据上传到你自建的**回放服务**（`serverUrl`），详见[主 README](../../README.zh.md)。

## ⚙️ 配置项（`WebTapeConfig`）

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `serverUrl` | `string` | — | **回放服务上传地址（生产必填）。** |
| `autoBackgroundRecord` | `boolean` | `true` | 是否自动启动后台滑动窗口录制。 |
| `backgroundWindowMs` | `number` | `30000` | 滑动窗口长度（毫秒）。 |
| `errorPrompt` | `boolean` | `false` | 哨兵模式：命中 HTTP 错误时弹上报提示。 |
| `errorPromptIgnore` | `{ urls?, statusCodes? }` | — | 忽略名单：匹配的 URL（子串/正则）或状态码不弹 toast。 |
| `locale` | `'en' \| 'zh'` | `'en'` | 注入 UI 的语言。 |

`configure()` 可重复调用——配置会合并且立即生效。

## 🧰 API

`configure` · `mountFab` · `startRecord` · `stopRecord` · `discardRecord` · `reportRecent` · `startBackgroundRecord` · `stopBackgroundRecord` · `getState` · `onStateChange` · `getConfig` · `RECORDING_STATE`

状态机：`finished → startRecord → recording → stopRecord → uploading → finished`（`discardRecord` 直接回到 `finished`）。CDN 构建下同一套 API 挂在 `window._webTape` 上。

## 🔗 链接

- 📖 文档：https://webtape.chenb.xyz/
- 📺 项目与自建：[github.com/chernbo/webTape](https://github.com/chernbo/webTape)

## 📄 许可

MIT · 基于 [rrweb](https://github.com/rrweb-io/rrweb) ❤️ 构建，特别感谢 rrweb 团队。
