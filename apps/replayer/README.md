# 📺 Web Tape — Replayer

基于 Next.js 16 构建的会话回放与批注分析平台,QA / 前端联调一站式现场复盘工具。
搭配 [`packages/toolbox`](../../packages/toolbox) 上传录屏,Replayer 提供回放、网络/控制台诊断、AI 分析与批注沟通。

## ✨ 核心能力

- 🎬 **会话回放** — 基于 rrweb 2.0 的全量 DOM 重放,支持倍速 (1× / 2× / 4× / 8×)
- 🎚️ **拖拽 scrub 时间轴** — Pointer Events + rAF 合帧,拖动播放头时画面实时跟随
- ⌨️ **快捷键** — `Shift+Space` 暂停/播放、`←` 回退 4s、`→` 快进 4s
- 🌐 **网络监控面板** — 时序图 + 详情展开,自动解析 URL Query Params,支持一键导出 cURL
- 📋 **控制台日志面板** — 高亮 level (log / info / warn / error),按时间轴对齐
- 🖍️ **批注系统** — 暂停后任意位置落 pin,色板分类 (red / yellow / green / blue / white),侧边栏批注沟通
- 🤖 **AI 分析** — 把网络/控制台/DOM 数据喂给 Workflow API,自动定位问题(需配置,见 [AI 分析配置](#-ai-分析配置))
- 🌓 **主题切换** — 可拖拽吸附四角的悬浮按钮,深色/浅色一键切换
- 🧩 **JSON 树视图** — 嵌套折叠,长字符串/二级 stringify body 都能漂亮展开

## 🛠️ 技术栈

| 类别     | 选型                                                                  |
| -------- | --------------------------------------------------------------------- |
| 框架     | Next.js 16 (App Router)                                               |
| UI       | React 18 + Ant Design 6                                               |
| 录制回放 | rrweb 2.0.0-alpha.4 / rrweb-player 1.0.0-alpha.4                      |
| 数据获取 | SWR 2.x                                                               |
| 状态     | React local + 派生 (`useMemo` / `useReducer` 风格)                    |
| 样式     | Sass Modules + CSS 变量主题                                           |
| 数据库   | MySQL (Prisma) — `fed_bugtape.recordings` + `fed_bugtape.annotations` |
| 布局     | react-resizable-panels (上中下三栏可拖)                               |

> 版本均为 pinned,升级请先沟通(rrweb 大版本会改 event 结构)。

## 🚀 快速开始

```bash
pnpm install
pnpm dev          # http://localhost:3100
pnpm build && pnpm start
pnpm lint
```

### 访问回放页

`http://localhost:3100/replayer?sourceId=<上传后端返回的 ID>`

`sourceId` 来自 toolbox 上传成功后的响应,等价于 MySQL `recordings` 表的主键。

## 📁 项目结构

```
src/app/
├── layout.tsx                          # 根布局 + Antd Registry
├── globals.css                         # 主题 CSS 变量(深/浅色)
├── page.tsx                            # 首页(产品介绍 + 接入指引)
├── api/
│   ├── replayer/route.ts               # POST 录屏 events → MySQL recordings
│   ├── recordings/[id]/route.ts        # GET / DELETE 录屏
│   ├── recordings/stats/route.ts       # 录屏量统计
│   ├── annotations/route.ts            # GET / POST 批注 CRUD
│   └── ai/analyze/route.ts             # POST AI 分析服务端代理 (持有 Workflow Key)
└── replayer/
    ├── page.tsx                        # 回放页(三栏 + 时间轴 + 批注侧边栏)
    ├── context/ThemeContext.tsx        # 主题切换上下文
    ├── hooks/
    │   ├── useEvents.ts                # SWR: 拉录屏 events
    │   ├── useAnnotations.ts           # SWR: 批注 CRUD + 乐观更新
    │   └── useLayoutInfo.ts            # 面板布局尺寸
    └── components/
        ├── RrwebPlayer.tsx             # 播放器初始化与实例上抛
        ├── RRwebTimeLine/              # 拖拽 scrub 时间轴 + 标记点 + 快捷键
        ├── MonitorNetworkPanel/        # 网络监控(含 Query Params 解析)
        ├── ConsoleLogPanel/            # 控制台日志
        ├── AiAnalysis/                 # AI 分析面板
        ├── AnnotationLayer/            # 播放器上的 SVG/pin 叠加层
        ├── AnnotationToolbar/          # 颜色色板
        ├── AnnotationSidebar/          # 批注列表侧边栏(Drawer)
        ├── DraggableFloatMenu/         # 主题切换悬浮按钮(吸附四角)
        ├── JsonTreeView/               # JSON 折叠树
        ├── CurlButton/                 # 网络请求一键复制 cURL
        ├── SkillsPanel/                # 能力扩展面板
        └── utils.tsx                   # 共享工具
```

## 🖍️ 批注系统说明

### 数据模型 (`fed_bugtape.annotations`)

```ts
interface Annotation {
  id: string // crypto.randomUUID()
  index: number // 1-based,删除后重排
  timestamp: number // ms,落 pin 时的播放时刻
  x: number // 0–1 相对坐标(播放器宽度比例)
  y: number // 0–1 相对坐标
  comment: string
  color: 'red' | 'yellow' | 'green' | 'blue' | 'white'
  createdAt: number
}
```

### 状态机

```
VIEW (远程数据,只读) → 落 pin / 编辑 → 自动写盘 (SWR optimistic) → 失败回滚
```

### 关键约束

- 落 pin 时若播放中则**自动暂停**
- 删除批注时同步清空 `activeId`,避免色板继续指向"鬼影 id"
- 时间轴会基于批注 timestamp 渲染 dot,点击 dot 跳到对应时刻
- `crypto.randomUUID()` 仅 secure context 可用,fallback 走 `时间戳+随机串`

## 🌐 网络监控面板

每条请求展开后包含:

- **URL** — 完整地址
- **Query Params** ✨ — 自动从 URL 解析,重复 key 合并为数组
- **Req Headers / Req Body / Res Headers / Res Body** — 全部走 JsonTreeView
- **cURL 按钮** — 一键复制可在终端执行的 curl 命令
- **时序条** — 在面板顶部时序图上展示请求位置和耗时,绿色=2xx,红色=非 2xx

## 🐳 Docker 部署

```bash
cp .env.example .env
docker compose up --build
```

默认会启动:

- `mysql` — 本地 MySQL 8.4, 持久化到 `mysql-data` volume
- `replayer` — Next.js 回放服务, 对外端口 `3100`

首次启动后访问:

- `http://localhost:3100`

可配置环境变量:

- `MYSQL_ROOT_PASSWORD`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `REPLAYER_PUBLIC_URL`
- `AI_WORKFLOW_API_URL` / `AI_WORKFLOW_API_KEY`（可选, 见下方 [AI 分析配置](#-ai-分析配置)）

`docker-compose.yml` 会自动把 `DATABASE_URL` 组装给应用容器,并在启动时执行 `prisma db push`,适合本地开发和快速体验。

## 🤖 AI 分析配置

AI 分析把「网络 / 控制台 / DOM」结构化数据分片喂给 Workflow API（Dify / Tify 等），逐片分析后汇总定位问题。相关配置**统一走 `.env`**，不再硬编码在组件里。

在 `.env` 里填两项即可开启：

```env
AI_WORKFLOW_API_URL="https://你的-workflow-endpoint/v1/workflows/run"
AI_WORKFLOW_API_KEY="你的-workflow-api-key"
```

关键设计：

- **服务端代理**：请求经 `src/app/api/ai/analyze/route.ts` 中转，`AI_WORKFLOW_API_KEY` 只在服务端使用。
- **⚠️ 切勿用 `NEXT_PUBLIC_` 前缀**：AI 分析是客户端组件，若把 Key 暴露成 `NEXT_PUBLIC_*`，会被打进浏览器 bundle，任何人都能在 devtools 看到。
- **优雅降级**：不配置这两项时，「AI 分析」按钮会返回"未配置"提示，不影响回放 / 网络 / 批注等其它功能。

## 🔑 主要约定

- **CSS**: 一律走 `globals.css` 的 `--panel-*` 变量,不写死颜色
- **数据获取**: 组件用 SWR,API Route 内部用 `fetch`,**禁用 axios**
- **ID**: 所有客户端生成 ID 用 `import { v4 as uuidv4 } from 'uuid'`
- **批注坐标**: 内存里始终是 0–1 相对值,渲染时再转 px
- **包管理器**: 仅 `pnpm`

## 🔗 相关资源

- [rrweb 文档](https://www.rrweb.io/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Ant Design 6](https://ant.design/)

## 📄 License

Private
