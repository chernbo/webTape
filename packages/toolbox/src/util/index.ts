import * as rrweb from 'rrweb'
import { EventType, type eventWithTime } from 'rrweb'
import { pack } from '@rrweb/packer'

import {
  installNetworkXHRInterceptor,
  uninstallNetworkXHRInterceptor,
  setNetworkErrorListener,
} from './networkXhrInterceptor'
import { showErrorToast } from '../ui/errorToast'
import { showReplayModal } from '../ui/replayModal'
import { getRecordConsolePlugin } from '@rrweb/rrweb-plugin-console-record'
import {
  pushSlidingEvent,
  snapshotSlidingBuffer,
  clearSlidingBuffer,
  configureSlidingBuffer,
} from './slidingBuffer'

// ─── 单例配置 ───
// 宿主页面通过 window._webTape.configure({...}) 注入运行时配置
export interface WebTapeConfig {
  /** 是否自动开启后台录制 (默认 true), 用于"最近 N 秒"快速上报 */
  autoBackgroundRecord?: boolean
  /** 滑动窗口长度 ms, 默认 30000 */
  backgroundWindowMs?: number
  /**
   * 哨兵模式: 检测到 HTTP >= 400 错误时, 自动弹通知引导用户上报最近 60s 现场.
   * 默认 false (业务方主动开). 同时只显示一个 toast, 连续错误天然去重.
   */
  errorPrompt?: boolean
  /**
   * 哨兵模式忽略名单 — 命中任一规则的错误不弹 toast.
   * 业务方按需排除"已知会失败但不需打扰"的接口 / 状态码 (如健康检查 404, 主动取消的 499 等).
   * 规则之间是 OR 关系, urls 与 statusCodes 也是 OR — 任一命中即忽略.
   */
  errorPromptIgnore?: ErrorPromptIgnore
  /**
   * 录屏上传后端地址 (回放服务 /api/replayer 的完整 URL).
   *
   * 作为独立开源 SDK, 每个使用方的 replayer 服务域名都不同, 因此上传地址是
   * **运行时参数**, 由接入方自行指定:
   *   configure({ serverUrl: 'https://your-replayer.example.com/api/replayer' })
   *
   * 未配置时回退到构建期默认值 DEFAULT_API_BASE (见下方), 仅适合本地自测.
   * 生产接入 **必须** 显式传入本项, 否则数据会发往默认地址而丢失.
   */
  serverUrl?: string
  /**
   * @internal @deprecated 旧的内部覆盖字段, 已由公开的 `serverUrl` 取代, 保留仅为向后兼容.
   */
  _apiBase?: string
}

/** 哨兵忽略名单. urls / statusCodes 任一命中则不弹 toast. */
export interface ErrorPromptIgnore {
  /** URL 子串 (substring) 或正则, 任一匹配即忽略. 子串匹配大小写敏感. */
  urls?: Array<string | RegExp>
  /** 状态码精确匹配, 任一相等即忽略. */
  statusCodes?: number[]
}

/**
 * 判定一个网络错误是否命中忽略名单 (内部使用).
 * 任一规则命中即返回 true, 调用方据此跳过 toast.
 */
function shouldIgnoreError(
  info: { url: string; status: number },
  rule: ErrorPromptIgnore | undefined,
): boolean {
  if (!rule) return false
  if (rule.statusCodes && rule.statusCodes.includes(info.status)) return true
  if (rule.urls) {
    for (const p of rule.urls) {
      if (typeof p === 'string') {
        if (info.url.includes(p)) return true
      } else if (p instanceof RegExp) {
        if (p.test(info.url)) return true
      }
    }
  }
  return false
}

let config: WebTapeConfig = {}

export function configureRRwebToolbox(next: WebTapeConfig) {
  config = { ...config, ...next }
  if (typeof next.backgroundWindowMs === 'number') {
    configureSlidingBuffer({ windowMs: next.backgroundWindowMs })
  }
  // 默认开启后台录制 (除非显式 false)
  if (next.autoBackgroundRecord !== false) {
    void startBackgroundRecord()
  }
}

export function getRRwebToolboxConfig(): Readonly<WebTapeConfig> {
  return config
}

// ─── 公开三态状态机 ───────────────────────────────
//
// finished   — 待录制 / 录制结束 (含丢弃后), 也是初始态
// recording  — 主动录制中, events 持续灌进 manualEvents
// uploading  — 上传中, stopRecord 或 reportRecent 触发, fetch resolve 后自动回 finished
//
// 状态流转图:
//   finished ─startRecord()──→ recording ─stopRecord()──→ uploading ──(fetch完)──→ finished
//                              recording ─discardRecord()──────────────────────────→ finished
//   finished ─reportRecent()─────────────→ uploading ──(fetch完)──→ finished
/** 公开的状态枚举常量 (业务方 JS 引用使用 + 内部状态切换都走这里) */
export const RECORDING_STATE = {
  Finished: 'finished',
  Recording: 'recording',
  Uploading: 'uploading',
} as const

/** 字面量类型从 RECORDING_STATE 反推, 单一来源, 改一处即可 */
export type RecordingState =
  (typeof RECORDING_STATE)[keyof typeof RECORDING_STATE]

let stopFn: (() => void) | null = null
let currentState: RecordingState = RECORDING_STATE.Finished
let manualEvents: eventWithTime[] = []
// 录制启动时刻的页面上下文 (录制中不会改, 用于上传时一起带上)
let recordingContext: { pageUrl: string; pageTitle: string } | null = null
// 缓存 Meta 事件 (rrweb 启动时只 emit 一次, sliding buffer 轮换或 manualEvents 起始
// 都可能没有 Meta, 上传时若首位不是 Meta 就把它补到最前面, 否则 rrweb-player 拿不到
// viewport width/height 会按 0×0 渲染 iframe → 回放空白)
let cachedMeta: eventWithTime | null = null

const stateListeners = new Set<(state: RecordingState) => void>()

function setState(next: RecordingState) {
  if (currentState === next) return
  currentState = next
  for (const cb of stateListeners) {
    try {
      cb(next)
    } catch (e) {
      console.warn('[web-tape] state listener threw:', e)
    }
  }
}

/** 确保底层 rrweb + 拦截器已启动 (幂等) */
async function ensureUnderlyingRecord() {
  if (stopFn) return

  installNetworkXHRInterceptor()

  // 注册一次哨兵监听, 内部 gate 配置开关; 默认 errorPrompt=false 时直接 noop.
  // 这样后续 configure({ errorPrompt: true }) 立即生效, 不需要重启 rrweb.
  //
  // 多重 gate (任一不满足都跳过):
  //   1. errorPrompt 开关
  //   2. 状态必须是 finished — 录制中 / 上传中不打扰用户:
  //      - recording: 用户已经主动录, 弹 toast 是干扰; reportRecent 在 recording 态本就 return false
  //      - uploading: SDK 自己正在传, 若 /api/replayer 自身报 5xx 会进这里, gate 阻止"上传失败 → 弹 → 又上传 → 又失败"死循环
  //   3. errorPromptIgnore 命中 — 业务方主动排除的接口 / 状态码 (健康检查 404、主动取消 499 等)
  setNetworkErrorListener((info) => {
    if (!config.errorPrompt) return
    if (currentState !== RECORDING_STATE.Finished) return
    if (shouldIgnoreError(info, config.errorPromptIgnore)) return
    showErrorToast(info, async () => {
      const result = await reportRecentSliding()
      // 上传成功 → 弹回放弹窗 (跟 FAB 路径一致, UX 一致)
      if (result) showReplayModal(result.url)
    })
  })

  stopFn =
    rrweb.record({
      emit(event, isCheckout) {
        // 缓存 Meta (rrweb 启动只 emit 一次), 上传兜底用
        if (event.type === EventType.Meta) {
          cachedMeta = event
        }
        // 后台滑动 buffer: 透传 isCheckout 信号用于 prev/curr 轮换
        pushSlidingEvent(event, isCheckout)
        // 手动录制态:同时累积到完整 events
        if (currentState === RECORDING_STATE.Recording) manualEvents.push(event)
      },
      // checkoutEveryNms = 滑动窗口长度, 让窗口稳定在 [windowMs, 2*windowMs)
      // (rrweb 仅在收到增量事件时检查触发 FS, 长静默场景由 slidingBuffer 内部兜底)
      checkoutEveryNms: config.backgroundWindowMs ?? 30_000,
      recordCanvas: true,
      maskTextClass: 'rr-mask',
      maskAllInputs: true,
      maskInputOptions: { password: true },
      maskInputFn: (text, el) => {
        if (el?.classList?.contains('rr-mask')) {
          return '*'.repeat(text.length || 1)
        }
        if ((el as HTMLInputElement)?.type === 'password') {
          return '*'.repeat(text.length || 1)
        }
        return text
      },
      plugins: [
        getRecordConsolePlugin({
          level: [
            'log',
            'info',
            'warn',
            'error',
            'trace',
            'group',
            'groupCollapsed',
            'groupEnd',
            'table',
            'time',
            'timeLog',
            'timeEnd',
          ],
        }),
      ],
    }) ?? null
}

/** 后台录制 (页面打开即跑, 仅维护 30s 滑动窗口) */
export async function startBackgroundRecord() {
  await ensureUnderlyingRecord()
}

/** 停止后台录制 (一般不需要,业务方主动关闭浮窗时调用) */
export function stopBackgroundRecord() {
  // 手动录制 / 上传中不允许打断
  if (currentState !== RECORDING_STATE.Finished) return
  if (stopFn) {
    stopFn()
    stopFn = null
  }
  uninstallNetworkXHRInterceptor()
  clearSlidingBuffer()
}

/** 录制上传成功的返回结构 */
export interface RecordingResult {
  /** 32 位 hex 标识, 用于关联其他业务数据 */
  sourceId: string
  /** 完整回放链接 (含 host), 业务方可直接展示 / 复制 */
  url: string
}

/**
 * 开始手动录制. 仅 finished 态可调,
 * recording / uploading 态调用直接 return, 不抛错.
 */
export async function startRRwebRecord() {
  if (currentState !== RECORDING_STATE.Finished) return
  await ensureUnderlyingRecord()
  manualEvents = []
  recordingContext = {
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    pageTitle: typeof document !== 'undefined' ? document.title : '',
  }
  setState(RECORDING_STATE.Recording)

  // rrweb 启动时打的 Meta + FullSnapshot 进了 slidingBuffer,未进 manualEvents。
  // 主动触发一次 checkout: rrweb 会同步 emit 新的 Meta + FullSnapshot,
  // 确保 manualEvents 自包含可回放,否则录制时长 < checkoutEveryNms 时回放空白。
  rrweb.record.takeFullSnapshot(true)
}

/**
 * 停止手动录制并上传完整事件.
 * recording → uploading → (fetch 完) finished, 无论成败都会回 finished.
 */
export async function stopRRwebRecord(): Promise<RecordingResult | false> {
  if (currentState !== RECORDING_STATE.Recording) return false
  // 切到 uploading, emit 不再灌进 manualEvents
  setState(RECORDING_STATE.Uploading)
  const snapshot = manualEvents
  manualEvents = []
  const ctx = recordingContext
  recordingContext = null
  try {
    return await uploadEvents(snapshot, ctx)
  } finally {
    setState(RECORDING_STATE.Finished)
  }
}

/** 丢弃当前录制 (不上传). recording → finished 直通 */
export function discardRRwebRecord() {
  if (currentState !== RECORDING_STATE.Recording) return
  manualEvents = []
  recordingContext = null
  setState(RECORDING_STATE.Finished)
  // 后台录制不动,继续滑动
}

/**
 * 上报"最近 N 秒"滑动窗口快照.
 * 仅 finished 态可调; finished → uploading → finished
 */
export async function reportRecentSliding(): Promise<RecordingResult | false> {
  if (currentState !== RECORDING_STATE.Finished) return false
  await ensureUnderlyingRecord()
  const snapshot = snapshotSlidingBuffer()
  if (snapshot.length === 0) return false
  const ctx = {
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    pageTitle: typeof document !== 'undefined' ? document.title : '',
  }
  setState(RECORDING_STATE.Uploading)
  try {
    return await uploadEvents(snapshot, ctx)
  } finally {
    setState(RECORDING_STATE.Finished)
  }
}

// ─── 状态查询 ─────────────────────────────────────

/** 当前录制状态 (同步取值, 不响应式) */
export function getRecordingState(): RecordingState {
  return currentState
}

/**
 * 订阅状态变化, 返回 unsubscribe 函数.
 * 订阅时立即触发一次当前态, 业务方一调订阅就能拿到初始值.
 */
export function onRecordingStateChange(
  cb: (state: RecordingState) => void,
): () => void {
  stateListeners.add(cb)
  try {
    cb(currentState)
  } catch {
    /* ignore */
  }
  return () => stateListeners.delete(cb)
}

// 录屏上传后端「默认」地址 (仅兜底): 构建期取 VITE_WEBTAPE_REPLAYER_API_BASE, 否则 localhost dev.
// 作为开源 SDK, 生产接入应通过运行时 configure({ serverUrl }) 指定, 不要依赖此默认值.
const DEFAULT_API_BASE =
  import.meta.env.VITE_WEBTAPE_REPLAYER_API_BASE ||
  'http://localhost:3100/api/replayer'

async function uploadEvents(
  snapshot: eventWithTime[],
  ctx: { pageUrl: string; pageTitle: string } | null,
): Promise<RecordingResult | false> {
  // Meta 兜底: rrweb 启动只 emit 一次 Meta(width/height/href),
  // sliding buffer 轮换 / manualEvents 起始都可能丢. 上传时若首位不是 Meta,
  // 用 cachedMeta 补到最前面, 否则 rrweb-player 按 0×0 渲染 → 回放空白.
  if (
    snapshot.length > 0 &&
    snapshot[0].type !== EventType.Meta &&
    cachedMeta
  ) {
    snapshot = [
      { ...cachedMeta, timestamp: snapshot[0].timestamp - 1 },
      ...snapshot,
    ]
  }

  try {
    // 用 rrweb 官方 @rrweb/packer 把每个 event 压成字符串. 内部 fflate zlib,
    // 实测压缩率 60-80%; 回放端 (rrweb-player) 配 unpackFn 自动还原, 上下游透明.
    // 录制阶段不开 packFn 是因为 packed event 是 string, 会破坏内部 cachedMeta /
    // sliding buffer 等需要按 event.type 判断的逻辑. 集中在上传前一次性 pack 最简单.
    const packedEvents = snapshot.map((e) => pack(e))

    const payload = {
      rrwebEvents: packedEvents,
      pageUrl: ctx?.pageUrl,
      pageTitle: ctx?.pageTitle,
    }

    // 上传地址优先级: 运行时 serverUrl > 旧内部字段 _apiBase > 构建期默认值
    const apiBase = config.serverUrl || config._apiBase || DEFAULT_API_BASE

    const resp = await fetch(apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((res) => res.json())

    // 新版后端: { ok: true, data: { sourceId, url } } —— url 已经是绝对路径
    if (resp?.data?.sourceId) {
      const sourceId = resp.data.sourceId as string
      const url = (resp.data.url as string) || sourceId
      return { sourceId, url }
    }

    // 旧版后端兼容: { data: { dstFileName: "xxx.json" } }, url 用 sourceId 兜底
    const dstFileName: string = resp?.data?.dstFileName ?? ''
    const sourceId = dstFileName.replace(/\.[^.]+$/, '')
    if (!sourceId) return false
    return { sourceId, url: sourceId }
  } catch (e) {
    return false
  }
}
