# 🎬 Web Tape — Toolbox

一个基于 [rrweb](https://github.com/rrweb-io/rrweb) 的轻量级页面录制工具箱:**后台滑动窗口录制 + 最近 N 秒一键回溯 + 哨兵模式自动提示**。打包成 IIFE,一行 `<script>` 即可嵌入,无需改造业务代码。

回放端搭配 [`apps/replayer`](../../apps/replayer) 使用。

## ✨ 特性

- 📹 **主动录制** — 用户点 FAB 开始/停止,完整事件上传
- 🔁 **后台滑动窗口** — 加载即跑,内存中始终保留最近 N 秒,不影响业务性能
- ⏪ **最近 N 秒一键回溯** — 用户遇到问题时,无需事先开录,一键上传"最近 60 秒"现场
- 🚨 **哨兵模式 (`errorPrompt`)** — 自动监听 HTTP 状态码,出现 4xx/5xx 时弹 toast 引导上报现场
- 🌐 **网络拦截** — 自动捕获 XHR 的 method / URL / 请求体 / 响应体,作为 rrweb plugin event 注入事件流
- 📝 **控制台日志** — rrweb 官方 console plugin
- 🎨 **Canvas 录制** — 支持 canvas 内容
- 🔘 **双按钮 FAB** — 主按钮(开始/停止录制) + 子按钮(最近历史一键上报),idle hover 时浮现
- ✅ **二次确认弹窗** — 停止录制时 popover 确认,避免误传
- ⏱️ **时长保护** — 主动录制最多 3 分钟,超时自动弹出确认
- 💾 **回放弹窗** — 上传成功后展示数据量 + 可分享链接

## 🚀 快速开始

```bash
pnpm install
cp .env.example .env         # 可选: 配本地自测的默认上传地址
pnpm dev                     # http://localhost:5173 (内置 demo 页)
pnpm build                   # 产出 dist/: index.mjs (npm) + web-tape.iife.js (CDN) + *.d.ts
pnpm preview
```

> `pnpm build` 分三步：`build:es`（ESM 库）→ `build:iife`（CDN 产物）→ `build:types`（类型声明）。

## 📦 接入方式

上传地址是**运行时参数** `serverUrl`，指向你自建的 replayer 服务，两种接入方式都必填。

### 方式一：npm 安装（推荐，适合工程化项目）

```bash
npm install @webtapejs/toolbox
```

```ts
import { configure, mountFab } from '@webtapejs/toolbox'

configure({
  // 必填: 你的回放服务上传地址
  serverUrl: 'https://your-replayer.example.com/api/replayer',
  autoBackgroundRecord: true,
  backgroundWindowMs: 30_000,
  errorPrompt: true,
  errorPromptIgnore: {
    urls: ['/heartbeat', /\/log\//],
    statusCodes: [499],
  },
})

// 需要内置悬浮录制按钮时再调用 (不调用则完全静默, 由你自渲染 UI)
mountFab()
```

> npm 入口 **无副作用**：`import` 不会自动挂 FAB / 自动录制，一切由你显式调用，适合按需集成。

### 方式二：一行 `<script>`（零代码，适合测试/预发页面）

```html
<!-- CDN, 例如 unpkg -->
<script src="https://unpkg.com/@webtapejs/toolbox/dist/web-tape.iife.js"></script>
<script>
  window._webTape.configure({
    // 必填: 你的回放服务上传地址
    serverUrl: 'https://your-replayer.example.com/api/replayer',
    autoBackgroundRecord: true,
    backgroundWindowMs: 30_000,

    // 哨兵模式: 默认关闭,业务方按需开
    errorPrompt: true,
    errorPromptIgnore: {
      // URL 子串或正则,任一命中即不弹 toast
      urls: ['/heartbeat', /\/log\//],
      // 状态码精确匹配
      statusCodes: [499],
    },
  })
</script>
```

> IIFE 入口**加载即启动**（自动挂 FAB + 后台录制）。想静默只用 core API，加 `data-builtin-fab="false"`。
>
> `serverUrl` 未配置时会回退到构建期默认值（`VITE_WEBTAPE_REPLAYER_API_BASE`，缺省 `http://localhost:3100/api/replayer`），**仅适合本地自测**，生产接入必须显式传 `serverUrl`。

### 配置项 (`WebTapeConfig`)

| 字段                            | 类型                      | 默认    | 说明                                       |
| ------------------------------- | ------------------------- | ------- | ------------------------------------------ |
| `serverUrl`                     | `string`                  | —       | **回放服务上传地址 (生产必填)**,如 `https://xxx/api/replayer` |
| `autoBackgroundRecord`          | `boolean`                 | `true`  | 是否自动启动后台滑动窗口录制               |
| `backgroundWindowMs`            | `number`                  | `30000` | 滑动窗口长度 ms                            |
| `errorPrompt`                   | `boolean`                 | `false` | 哨兵模式开关:命中错误后自动 toast 提示上报 |
| `errorPromptIgnore.urls`        | `Array<string \| RegExp>` | —       | URL 忽略名单,子串或正则                    |
| `errorPromptIgnore.statusCodes` | `number[]`                | —       | 状态码忽略名单                             |

> `configure()` 可重复调用 — 配置会合并,新值即刻生效,无需重启 rrweb。

## 📖 API 速查

`import { ... } from '@webtapejs/toolbox'` 可用的全部导出：

| API | 签名 | 说明 |
| --- | --- | --- |
| `configure` | `(config: WebTapeConfig) => void` | 注入配置,可重复调用(合并) |
| `mountFab` | `() => Promise<void>` | 挂载内置悬浮录制按钮(可选,不调则静默) |
| `startRecord` | `() => Promise<void>` | 开始主动录制(仅 `finished` 态可调) |
| `stopRecord` | `() => Promise<RecordingResult \| false>` | 停止并上传,返回 `{ sourceId, url }` |
| `discardRecord` | `() => void` | 丢弃当前录制(不上传) |
| `reportRecent` | `() => Promise<RecordingResult \| false>` | 一键回溯:上传后台滑动窗口的最近 N 秒 |
| `startBackgroundRecord` | `() => Promise<void>` | 手动启动后台滑动窗口录制(幂等) |
| `stopBackgroundRecord` | `() => void` | 停止后台录制 |
| `getState` | `() => RecordingState` | 取当前状态 |
| `onStateChange` | `(cb: (s: RecordingState) => void) => () => void` | 订阅状态变化,立即回调一次,返回取消订阅函数 |
| `getConfig` | `() => Readonly<WebTapeConfig>` | 读当前配置 |
| `RECORDING_STATE` | `{ Finished, Recording, Uploading }` | 状态枚举常量 |

类型导出：`WebTapeConfig`、`ErrorPromptIgnore`、`RecordingState`、`RecordingResult`。

状态机：`finished ──startRecord──▶ recording ──stopRecord──▶ uploading ──(上传完)──▶ finished`（`discardRecord` 从 recording 直接回 finished）。

> CDN(`<script>`)接入时同一套 API 挂在 `window._webTape` 上（方法名一致，如 `window._webTape.startRecord()`）。

## 🎮 功能说明

### 双按钮 FAB

页面右下角圆形主按钮,hover idle 态时上方浮现"最近历史"子按钮:

- **主按钮 (开始 / 停止录制)**
  - 点击 → 主动录制(呼吸动画 + 计时显示)
  - 再次点击 → 弹出 popover:`是否提交本次录制信息?`
  - 确认 → 上传完整事件 → 弹回放弹窗
  - 取消 → 丢弃,返回 idle
- **子按钮 (最近历史 → "上传最近 60s 数据")**
  - 仅 idle 态可用
  - 一键把后台滑动窗口里的最近 N 秒事件直接上传 → 弹回放弹窗
  - 适用场景:用户已遇到问题,希望"事后回溯"近一分钟现场,无需先开录

### 后台滑动窗口录制

工具箱加载即启动后台 rrweb(`autoBackgroundRecord: false` 可关),双 buffer 轮换 + checkout 信号始终保留最近 `backgroundWindowMs` 范围内事件。窗口实际跨度稳定在 `[windowMs, 2 * windowMs)`。长静默场景下若 `prev` 跨度异常 (`> 2 * windowMs`) 自动丢弃,避免上报跨天数据。

### 哨兵模式 (errorPrompt)

开启后,网络拦截器对每个请求都做错误检查:

- HTTP 状态 ≥ 400 → 走 `errorPromptIgnore` 过滤(URL 子串/正则 + 状态码白名单)
- 未命中忽略规则 → 弹 toast(`检测到接口异常 (xxx)`)+ "上传现场"按钮
- toast **单例**:已有 toast 显示中跳过新错误,天然去重连续错误
- toast 自身打 `rr-block` class,不会被 rrweb 录入(避免回放看到提示框)

### 录制限制

- **主动录制最大时长**: 3 分钟,达到上限自动弹二次确认
- **录制中**: 按钮呼吸动画 + 实时计时

### 回放弹窗

录制完成弹窗包含:关闭按钮 / 事件数量与数据大小 / 可复制的回放链接 / 一键复制按钮。

## 🛠️ 技术栈

- **rrweb** — 核心录制回放引擎(v2.0.0-alpha.4)
- **TypeScript** — 类型安全
- **Vite** — 构建工具
- **IIFE 输出** — 一个 JS 文件,`<script>` 标签直接引入,无运行时依赖

## 📁 项目结构

```
packages/toolbox/
├── src/
│   ├── index.ts                      # npm 库入口(命名导出 + mountFab, 无副作用)
│   ├── main.ts                       # IIFE/dev 入口(引入 uiEmbed)
│   ├── ui/
│   │   ├── uiEmbed.ts                # UI 编排(init / 暴露 window._webTape)
│   │   ├── recordFab.ts              # 双按钮 FAB(状态机 + 二次确认 + 计时)
│   │   ├── replayModal.ts            # 回放弹窗
│   │   ├── errorToast.ts             # 哨兵模式 toast(单例 + 进度条 + close)
│   │   ├── theme.ts                  # 主题变量(色值 / 圆角 / 字号)
│   │   ├── icons.ts                  # SVG 图标集中管理
│   │   ├── dom.ts                    # 通用 DOM 工具(剪贴板 / 注入样式 / 时间格式)
│   │   └── style.css                 # 样式
│   └── util/
│       ├── index.ts                  # configure + 录制管理 + 上传
│       ├── slidingBuffer.ts          # 双 buffer 滑动窗口
│       ├── networkXhrInterceptor.ts  # XHR 监听(record + sentinel)
│       └── type.ts                   # 类型
├── public/
│   ├── record.svg                    # FAB 图标
│   └── web-tape.d.ts                 # <script> 用户可参考的类型声明
├── index.html                        # dev demo (pnpm dev)
├── vite.config.ts                    # 双产物构建(ESM + IIFE)
├── tsconfig.json / tsconfig.build.json
└── package.json
```

## 🔧 核心模块

### 1. 录制管理 (`src/util/index.ts`)

- `configureRRwebToolbox(config)` — 注入运行时配置(可重复调用,合并)
- `startBackgroundRecord()` — 启动后台滑动窗口录制(幂等)
- `stopBackgroundRecord()` — 停止后台(主动录制中禁用)
- `startRRwebRecord()` — 开始主动录制(在后台基础上累积完整 events)
- `stopRRwebRecord()` — 停止主动录制并上传
- `discardRRwebRecord()` — 丢弃主动录制(后台继续)
- `reportRecentSliding()` — 一键上传滑动窗口快照(最近 N 秒)
- `getRecordingState()` / `onRecordingStateChange(cb)` — 三态状态机查询/订阅

### 2. 滑动窗口 (`src/util/slidingBuffer.ts`)

- 双 buffer 轮换:`prev` + `curr`,rrweb `isCheckout=true` 时归档
- 上报取 `prev.concat(curr)`,必含 FullSnapshot 起点
- 长静默兜底:prev 跨度 > `2 * windowMs` 自动丢弃

### 3. 网络拦截 (`src/util/networkXhrInterceptor.ts`)

- monkey-patch `XMLHttpRequest`
- 每个请求生成 rrweb plugin event(method / URL / 请求体 / 响应体 / 状态码 / 计时)
- 同时驱动哨兵 toast(若 `errorPrompt` 开启且未命中 ignore)

### 4. 状态机

```
finished  ─ start ─→ recording  ─ stop ─→ uploading  ─ resolve ─→ finished
   ↑                     │
   └─── discard ─────────┘
```

UI 通过 `onRecordingStateChange` 订阅,主按钮和子按钮的可点击/动画都按状态切换。

## 🌐 API

### 录制上传

```
POST https://your-replayer-service.example.com/api/replayer
```

默认地址为 `http://localhost:3100/api/replayer`，构建时可通过 `.env` 配置 `VITE_WEBTAPE_REPLAYER_API_BASE` 修改。

请求体:

```json
{
  "rrwebEvents": [...],
  "pageUrl": "https://your-app.example/path",
  "pageTitle": "页面标题"
}
```

响应:

```json
{ "ok": true, "data": { "sourceId": "xxx", "url": "回放链接" } }
```

## 📝 开发说明

### 修改最大主动录制时长

`src/ui/recordFab.ts`:

```ts
const MAX_RECORDING_DURATION_MS = 3 * 60 * 1000 // 默认 3 分钟
```

### 修改上传地址

运行时通过 `configure({ serverUrl })` 指定，无需改代码或重新构建。
构建期默认值（本地自测兜底）可在 `.env` 里配 `VITE_WEBTAPE_REPLAYER_API_BASE`。

## 📄 License

MIT

---

Made with ❤️ using [rrweb](https://github.com/rrweb-io/rrweb)
