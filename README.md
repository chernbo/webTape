<div align="center">

# 📺 Web Tape

**Record & replay web sessions.** Capture user actions, network requests and console
logs with one line, then replay them on a timeline with annotations, cURL reproduction
and AI summaries — so "cannot reproduce" is a thing of the past.

English · [简体中文](./README.zh.md)

[![npm](https://img.shields.io/npm/v/@webtapejs/toolbox.svg)](https://www.npmjs.com/package/@webtapejs/toolbox)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

[Documentation](https://webtape.chenb.xyz/) · [npm](https://www.npmjs.com/package/@webtapejs/toolbox)

<br/>

<table>
  <tr>
    <td width="50%" align="center">
      <img src="./assets/record.gif" alt="Record and pin annotations on the replay" width="100%" />
      <br/><sub><b>Record & pin annotations</b></sub>
    </td>
    <td width="50%" align="center">
      <img src="./assets/ai-analyze.gif" alt="Timeline replay and AI analysis" width="100%" />
      <br/><sub><b>Replay timeline & AI analysis</b></sub>
    </td>
  </tr>
</table>

</div>

---

## ✨ Features

- 🚨 **Sentinel mode** — watches HTTP 4xx/5xx and prompts a one-click report on hit.
- 🔁 **Background sliding window** — always keeps the last N seconds in memory, so you can rewind a bug even without recording ahead of time.
- 🌐 **Full capture** — page interactions, network requests and console logs in one event stream.
- 🎚️ **Rich replay** — drag-to-scrub timeline, keyboard shortcuts, on-frame annotations, network/console panels, copy-as-cURL and AI summaries.
- 🌓 **Theming & i18n** — light / dark theme and English / 中文, switchable at runtime.
- 🧩 **Zero business changes** — drop in a single `import` or `<script>`; the SDK is fully isolated.

## 📦 Install

```bash
npm install @webtapejs/toolbox
# or: pnpm add @webtapejs/toolbox / yarn add @webtapejs/toolbox
```

Or load it via CDN — no build step:

```html
<script src="https://unpkg.com/@webtapejs/toolbox/dist/web-tape.iife.js"></script>
```

## 🔨 Usage

```ts
import { configure, mountFab } from '@webtapejs/toolbox'

configure({
  serverUrl: 'https://your-replayer.example.com/api/replayer', // your replay service (see below)
  autoBackgroundRecord: true,
  errorPrompt: true,   // Sentinel mode
  locale: 'en',        // injected UI language: 'en' (default) | 'zh'
})

mountFab() // optional: mount the built-in floating record button
```

> Replay & upload need a **replay service**. Self-host it in one command (Docker required):
>
> ```bash
> curl -fsSL https://raw.githubusercontent.com/chernbo/webTape/main/deploy/install.sh | bash
> ```
>
> This brings up MySQL + the replayer on `http://localhost:3100`; use `http://localhost:3100/api/replayer` as your `serverUrl`. The upload endpoint is unauthenticated by design (Web Tape rides inside a host app rather than being a standalone service) — add auth at your gateway if exposing it publicly.

Full API, configuration and guides live in the **[documentation site](https://webtape.chenb.xyz/)**.

## 🔗 Links

- 📖 **Documentation**: https://webtape.chenb.xyz/
- 📦 **npm**: [`@webtapejs/toolbox`](https://www.npmjs.com/package/@webtapejs/toolbox)
- 🧩 **SDK reference**: [`packages/toolbox`](./packages/toolbox#readme)

## ⌨️ Development

This repo is a pnpm monorepo (`packages/toolbox` — the SDK · `apps/replayer` — the replay app).

```bash
pnpm install
# SDK:      cd packages/toolbox && pnpm dev
# Replayer: cd apps/replayer && pnpm dev   # http://localhost:3100
```

## 📄 License

[MIT](./LICENSE) · Made with ❤️ on top of [rrweb](https://github.com/rrweb-io/rrweb) — huge thanks to the rrweb team.
