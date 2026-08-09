# CLAUDE.md — webTape-replayer

This file provides guidance to Claude Code when working in this repository.

---

## Commands

```bash
pnpm dev          # Dev server at http://localhost:3000
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # ESLint
```

---

## Tech Stack (pinned versions — do not upgrade without discussion)

| Package      | Version       | Notes                                                    |
| ------------ | ------------- | -------------------------------------------------------- |
| Next.js      | 16.1.6        | App Router                                               |
| React        | 18.3          |                                                          |
| Ant Design   | 6.x           | NOT v4/v5 — use v6 APIs                                  |
| SWR          | 2.3           | for remote data fetching                                 |
| rrweb        | 2.0.0-alpha.4 | session replay engine                                    |
| rrweb-player | 1.0.0-alpha.4 | replay UI wrapper                                        |
| dayjs        | 1.x           | date library (allowed here, unlike b1)                   |
| SCSS Modules | sass 1.x      | all component styles use `.module.scss` or `.module.css` |
| uuid         | 13.x          | `import { v4 as uuidv4 } from 'uuid'`                    |
| TypeScript   | 5.x           | strict mode                                              |

**Package manager: `pnpm`** — never use npm/yarn here.

---

## Project Structure

```
src/app/
├── layout.tsx                    # Root layout
├── globals.css                   # CSS variables (dark/light theme)
├── page.tsx                      # Home / redirect page
├── api/
│   ├── replayer/route.ts         # POST: 写入录屏 events 到 MySQL
│   ├── recordings/[id]/route.ts  # GET: 从 MySQL 读 events / DELETE: 删录屏
│   ├── recordings/stats/route.ts # GET: 录屏量统计
│   └── annotations/route.ts      # GET/POST: 批注 CRUD (MySQL)
└── replayer/
    ├── page.tsx                  # Main replayer page (4-panel layout)
    ├── style/index.module.scss   # Replayer page styles
    ├── context/ThemeContext.tsx  # Dark/light theme toggle
    ├── hooks/
    │   ├── useEvents.ts          # SWR: fetches rrweb events from /api/recordings/:id (MySQL)
    │   └── useLayoutInfo.ts      # Panel resize state
    └── components/
        ├── RrwebPlayer.tsx           # rrweb-player init & control
        ├── RRwebTimeLine/            # Custom timeline (progress, markers, hotkeys)
        ├── ConsoleLogPanel/          # Console logs panel
        ├── MonitorNetworkPanel/      # Network requests panel
        ├── AiAnalysis/               # AI analysis panel
        ├── DraggableFloatMenu/       # Floating toolbar
        ├── JsonTreeView/             # JSON tree renderer
        └── utils.tsx                 # Shared utilities
```

---

## CSS Theme System

All component styles **must** use CSS variables from `globals.css`, never hardcoded colors.

Key variables:

```css
--panel-bg          /* main background */
--panel-bg-deep     /* deeper panel bg */
--panel-border      /* border color */
--panel-text        /* primary text */
--panel-text-muted  /* secondary text */
--panel-accent      /* #4fc1ff (dark) / #0078d4 (light) — interactive elements */
--panel-error       /* error red */
--panel-warn        /* warning yellow */
--panel-success     /* success green */
--panel-track-fill  /* timeline progress fill */
```

Theme is toggled via `data-theme="dark"|"light"` on the root element (`ThemeContext`).

---

## Data Fetching

- Use **SWR** (`import useSWR from 'swr'`) for all component-level remote data.
- Use `fetch` directly inside API routes (`src/app/api/`).
- Never import axios.

rrweb events are loaded via `useEvents.ts`:

```ts
// fetches: /api/recordings/{sourceId} → fed_bugtape.recordings (MySQL)
const { data: events, isLoading } = useEvents(sourceId)
```

---

## FBT (Web Tape) Annotation System

In-progress feature. Key design decisions:

### State Machine (3 states)

```
VIEW → EDIT → SUBMITTING → VIEW
```

- **VIEW**: Read-only. Data loaded from remote (SWR). Edit button visible.
- **EDIT**: localDraft mode. All changes in memory only. Cancel/Submit buttons visible.
- **SUBMITTING**: Async PUT in flight. UI blocked with spinner overlay.

### State Layer

- **SWR**: `events[]` + `annotations[]` (remote source of truth)
- **Zustand**: `mode`, `localDraft`, `activeAnnotationId` (UI state)
- **useMemo**: `mergedEvents` = `[...events, ...annotationsToCustomEvents(annotations)].sort()`

### Annotation Data Model

```ts
interface Annotation {
  id: string // crypto.randomUUID()
  index: number // 1-based, reindexed on delete
  timestamp: number // ms (player current time when drawing started)
  x: number // relative 0–1 (left fraction of player width)
  y: number // relative 0–1 (top fraction of player height)
  width: number // relative 0–1
  height: number // relative 0–1
  title: string
  comment: string
  color: 'red' | 'yellow' | 'green' | 'blue' | 'white'
  createdAt: number // Date.now()
}
```

### Drawing Rules

- SVG overlay (`position:absolute; inset:0`) on top of rrweb player
- Drawing requires player to be **paused** — if playing when mousedown, auto-pause first
- Coordinates stored as **relative 0–1** fractions, converted to px on render
- All draw changes go to `localDraft` (in memory), not persisted until Submit

### Persistence (MySQL two-table)

| Table                     | Content                                       | Write timing                                         |
| ------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| `fed_bugtape.recordings`  | rrweb events (LONGTEXT, immutable)            | 录制结束 POST `/api/replayer` 一次写入, FBT 不会重写 |
| `fed_bugtape.annotations` | 批注行 (FK → recordings.id, onDelete:Cascade) | Submit 时事务里 `deleteMany + createMany` 全量覆盖   |

写批注前必须先有对应 recording, 否则 `POST /api/annotations` 返回 404。

### rrweb Custom Events (timeline dots)

```ts
// annotation → rrweb event
{ type: 6, data: { tag: 'fbt-annotation', payload: { annotationId, color, index } }, timestamp }
```

### Cancel Dirty-Check

- `isDirty = JSON.stringify(localDraft) !== JSON.stringify(remoteAnnotations)`
- If dirty → show confirmation modal before discarding
- If clean → exit EDIT immediately

---

## Key Conventions

- **SCSS Modules**: name files `ComponentName/index.module.scss`, import as `styles`
- **No `console.log`**: use proper error boundaries or remove before commit
- **`uuid` for IDs**: `import { v4 as uuidv4 } from 'uuid'`
- **Relative annotation coords**: always store 0–1, convert to px only at render time
- **`sourceId`**: comes from URL query param `?sourceId=xxx`
