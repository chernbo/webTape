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

<b>📼 Capture side · SDK (@webtapejs/toolbox)</b>

<table>
  <tr>
    <td width="50%" align="center">
      <img src="./assets/recent.gif" alt="Upload the recent background recording in one click" width="100%" />
      <br/><sub><b>Recent recording · one-click backtrack</b></sub>
    </td>
    <td width="50%" align="center">
      <img src="./assets/sentinel.gif" alt="Sentinel mode auto-prompts a report on API errors" width="100%" />
      <br/><sub><b>Sentinel mode · auto error prompt</b></sub>
    </td>
  </tr>
</table>

<b>▶️ Replay side · self-hosted platform</b>

<table>
  <tr>
    <td width="50%" align="center">
      <img src="./assets/record.gif" alt="Pin annotations on the replay" width="100%" />
      <br/><sub><b>Pin annotations on the replay</b></sub>
    </td>
    <td width="50%" align="center">
      <img src="./assets/ai-analyze.gif" alt="AI summary analysis" width="100%" />
      <br/><sub><b>AI summary analysis</b></sub>
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

## 🚀 Getting started

### 1. Start the replay service

Recordings are uploaded to and replayed on a **self-hosted replay service**. With Docker installed, one command brings it up (random password, no manual `.env`):

```bash
curl -fsSL https://raw.githubusercontent.com/chernbo/webTape/main/deploy/install.sh | bash
```

<details>
<summary><b>Step by step</b> (download & inspect the script, then manage the stack)</summary>

```bash
# 1. Download the installer (read it before running if you like)
curl -fsSL https://raw.githubusercontent.com/chernbo/webTape/main/deploy/install.sh -o install.sh

# 2. Run it — generates .env (random password) + docker-compose.yml, then starts the stack
bash install.sh
#   custom port:            WEBTAPE_PORT=8080 bash install.sh
#   only generate, no start: WEBTAPE_NO_START=1 bash install.sh

# 3. Manage the stack (inside the generated ./webtape dir)
cd webtape
docker compose ps                              # status
docker compose logs -f replayer                # follow logs
docker compose pull && docker compose up -d    # update to the latest image
docker compose down                            # stop
docker compose down -v                         # stop + wipe MySQL volume (reset data & credentials)
```

> Seeing a MySQL `P1000 authentication failed`? A stale `webtape_mysql-data` volume from a previous run has an old password. Run `docker compose down -v` then `docker compose up -d` to re-initialize.

</details>

Then open **http://localhost:3100** — it ships with a **built-in demo page you can try right away** (record → get a shareable replay link). Your upload endpoint (the SDK's `serverUrl`) is `http://localhost:3100/api/replayer`.

> The upload endpoint is unauthenticated by design — Web Tape rides inside a host app rather than being a standalone service. Add auth at your gateway if you expose it publicly.

### 2. Add the SDK to your own app (optional)

To **record another front-end app**, inject the capture SDK into it via **npm** or a **`<script>`** tag, and point `serverUrl` at the service from step 1:

```bash
npm install @webtapejs/toolbox
# or via CDN, no build step:
# <script src="https://unpkg.com/@webtapejs/toolbox/dist/web-tape.iife.js"></script>
```

```ts
import { configure, mountFab } from '@webtapejs/toolbox'

configure({ serverUrl: 'http://localhost:3100/api/replayer', errorPrompt: true, locale: 'en' })
mountFab() // optional built-in floating button; or drive recording via the Core API
```

Full API, configuration and integration guides live in the **[documentation site](https://webtape.chenb.xyz/)**.

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
