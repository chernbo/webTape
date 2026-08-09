/**
 * 滑动窗口 buffer (双 buffer 轮换 + checkout 信号)
 *
 * 录制时持续接收 rrweb 事件,内存始终只保留"最近一段"事件:
 *   - prev: 上一个 checkout 周期的事件
 *   - curr: 当前 checkout 周期, 起点必为 FullSnapshot
 *   - rrweb emit 携带 isCheckout=true 时(checkoutEveryNms 触发的 FS),
 *     轮换 prev = curr, curr = [新 FS]
 *
 * 上报: 返回 prev.concat(curr), 必含 FullSnapshot 起点, 长度 ∈ [windowMs, 2*windowMs)
 *
 * ─── 长静默场景兜底 ───
 * rrweb 的 checkoutEveryNms 仅在收到增量事件时检查并触发 FS,
 * 用户长时间不操作时不会自然产生 checkout, 导致 prev 跨度可能远超 windowMs。
 * 上报时检测 prev 跨度 > 2*windowMs 则丢弃 prev, 只用 curr (起点为 fresh FS)。
 * 这样最坏情况上报数据约 1 帧静态截图, 而不是跨天数据。
 *
 * ─── 配套要求 ───
 * 调用方 record() 必须:
 *   - 设置 checkoutEveryNms (建议 = windowMs, 让窗口稳定在 [windowMs, 2*windowMs))
 *   - emit 时把 isCheckout 透传给 pushSlidingEvent
 */
import { EventType, type eventWithTime } from "rrweb";

export interface SlidingBufferOptions {
  /** 窗口长度, 默认 30s */
  windowMs?: number;
}

const DEFAULT_WINDOW_MS = 30_000;

let windowMs = DEFAULT_WINDOW_MS;
let prev: eventWithTime[] = [];
let curr: eventWithTime[] = [];

export function configureSlidingBuffer(opts: SlidingBufferOptions = {}) {
  windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
}

export function getSlidingWindowMs(): number {
  return windowMs;
}

/**
 * @param event rrweb 事件
 * @param isCheckout rrweb emit 第二个参数, true 表示这是 checkoutEveryNms 触发的 FullSnapshot
 */
export function pushSlidingEvent(event: eventWithTime, isCheckout?: boolean) {
  // checkout 信号 = 新窗口起点, 把旧 curr 归档到 prev
  if (isCheckout && event.type === EventType.FullSnapshot) {
    prev = curr;
    curr = [];
  }
  curr.push(event);
}

/** 取当前窗口快照 (浅拷贝), 后续录制不会污染返回的数组 */
export function snapshotSlidingBuffer(): eventWithTime[] {
  if (curr.length === 0 && prev.length === 0) return [];

  // prev 跨度过大 = 长静默期累积, 丢弃; 只用 curr (其起点是 fresh FullSnapshot)
  if (prev.length > 0 && shouldDiscardPrev()) {
    return curr.slice();
  }
  return prev.concat(curr);
}

export function clearSlidingBuffer() {
  prev = [];
  curr = [];
}

export function getSlidingBufferSize(): number {
  return prev.length + curr.length;
}

function shouldDiscardPrev(): boolean {
  // prev 第一个事件到 curr 最后一个事件的时间跨度
  const first = prev[0];
  const last =
    curr.length > 0 ? curr[curr.length - 1] : prev[prev.length - 1];
  if (!first || !last) return false;
  return last.timestamp - first.timestamp > 2 * windowMs;
}
