# @webtapejs/toolbox

The **capture side** of [Web Tape](https://github.com/chernbo/webTape) — a lightweight, [rrweb](https://github.com/rrweb-io/rrweb)-based browser recording SDK. One `import` or `<script>` records page interactions, network requests and console logs, with a background sliding window, one-click rewind and a sentinel mode for API errors.

English · [简体中文](./README.zh.md)

[![npm](https://img.shields.io/npm/v/@webtapejs/toolbox.svg)](https://www.npmjs.com/package/@webtapejs/toolbox)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

## ✨ Features

- 🚨 **Sentinel mode** — watches HTTP 4xx/5xx and prompts a one-click report on hit.
- 🔁 **Background sliding window** — always keeps the last N seconds in memory (default 30s).
- ⏪ **One-click rewind** — upload the recent scene when a bug happens, no need to record ahead.
- 🌐 **Full capture** — XHR interception + rrweb console plugin, merged into one event stream.
- 🔘 **Built-in FAB** — optional floating record button with confirm + duration guard.
- 🌍 **i18n** — injected UI is English by default, switchable to Chinese.

## 📦 Install

```bash
npm install @webtapejs/toolbox
# or: pnpm add @webtapejs/toolbox / yarn add @webtapejs/toolbox
```

## 🔨 Usage

```ts
import { configure, mountFab } from '@webtapejs/toolbox'

configure({
  serverUrl: 'https://your-replayer.example.com/api/replayer', // required
  autoBackgroundRecord: true,
  errorPrompt: true,   // sentinel mode
  locale: 'en',        // 'en' (default) | 'zh'
})

mountFab() // optional built-in floating button; omit to render your own UI
```

The npm entry is **side-effect free** — nothing runs until you call it.

Zero-code via CDN (auto-mounts the FAB + background recording on load):

```html
<script src="https://unpkg.com/@webtapejs/toolbox/dist/web-tape.iife.js"></script>
<script>
  window._webTape.configure({ serverUrl: 'https://your-replayer.example.com/api/replayer' })
</script>
```

> Add `data-builtin-fab="false"` to stay silent, or `data-locale="zh"` for Chinese.
> Recordings upload to a self-hosted **replay service** (`serverUrl`); see the [main README](../../README.md).

## ⚙️ Options (`WebTapeConfig`)

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `serverUrl` | `string` | — | **Upload endpoint of your replay service (required in production).** |
| `autoBackgroundRecord` | `boolean` | `true` | Auto-start the background sliding-window recording. |
| `backgroundWindowMs` | `number` | `30000` | Sliding window length (ms). |
| `errorPrompt` | `boolean` | `false` | Sentinel mode: toast a report prompt on HTTP errors. |
| `errorPromptIgnore` | `{ urls?, statusCodes? }` | — | Skip toast for matched URLs (substring/RegExp) or status codes. |
| `locale` | `'en' \| 'zh'` | `'en'` | Language of the injected UI. |

`configure()` can be called repeatedly — values are merged and take effect immediately.

## 🧰 API

`configure` · `mountFab` · `startRecord` · `stopRecord` · `discardRecord` · `reportRecent` · `startBackgroundRecord` · `stopBackgroundRecord` · `getState` · `onStateChange` · `getConfig` · `RECORDING_STATE`

State machine: `finished → startRecord → recording → stopRecord → uploading → finished` (`discardRecord` returns to `finished` directly). The same API is exposed on `window._webTape` for the CDN build.

## 🔗 Links

- 📖 Documentation: https://webtape.chenb.xyz/
- 📺 Project & self-hosting: [github.com/chernbo/webTape](https://github.com/chernbo/webTape)

## 📄 License

MIT · Made with ❤️ on top of [rrweb](https://github.com/rrweb-io/rrweb) — huge thanks to the rrweb team.
