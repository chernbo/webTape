/**
 * UI 入口编排文件
 *
 * 两种接入模式:
 *
 *   A. 零代码接入 (默认显示 FAB)
 *      <script src="web-tape.iife.js"></script>
 *
 *   B. 自渲染 UI, 只用 core API (静默, 不挂 FAB)
 *      <script src="web-tape.iife.js" data-builtin-fab="false"></script>
 *      <script>
 *        window._webTape.configure({ errorPrompt: true });
 *        window._webTape.onStateChange((s) => { ... });
 *        myStartBtn.onclick = () => window._webTape.startRecord();
 *      </script>
 */

import { createRecordFab } from "./recordFab";
import { setSdkLocale } from "../i18n";
import {
  configureRRwebToolbox,
  startBackgroundRecord,
  startRRwebRecord,
  stopRRwebRecord,
  discardRRwebRecord,
  reportRecentSliding,
  getRecordingState,
  onRecordingStateChange,
  RECORDING_STATE,
  type WebTapeConfig,
  type RecordingState,
  type RecordingResult,
} from "../util";

// ─── 启动期决策: 是否挂内置 FAB ────────────────────────────
//
// 同步读 <script> 标签的 data-builtin-fab 属性, 默认 true.
// 不依赖 configure 调用, 完全无闪烁.
//
// 优先级:
//   1. document.currentScript  (生产 IIFE 走这条)
//   2. document.querySelector("script[data-builtin-fab]")
//      (兼容 vite dev 的 <script type="module">: currentScript 为 null)
const scriptEl =
  (document.currentScript as HTMLScriptElement | null) ??
  document.querySelector<HTMLScriptElement>("script[data-builtin-fab], script[data-locale]");
const enableBuiltinFab = scriptEl?.dataset.builtinFab !== "false";

// 语言: 读 <script data-locale="zh">, 默认 en。需在挂 FAB 前设置。
// Locale: read <script data-locale="zh">, defaults to en. Must be set before mounting the FAB.
setSdkLocale(scriptEl?.dataset.locale);

if (enableBuiltinFab) {
  createRecordFab();
}

// 后台滑动录制无论 FAB 是否启用都跑 (configure 中可关闭 autoBackgroundRecord)
void startBackgroundRecord().catch((e) =>
  console.warn("[web-tape] background record failed:", e),
);

// ─── 全局 API ────────────────────────────────────────────

declare global {
  interface Window {
    _webTape?: {
      // ── 配置 ──
      configure: (config: WebTapeConfig) => void;

      // ── 录制控制 ──
      /** 开始手动录制. 仅 finished 态可调 */
      startRecord: () => Promise<void>;
      /** 停止录制并上传, 返回 { sourceId, url }; 不在 recording 态返回 false */
      stopRecord: () => Promise<RecordingResult | false>;
      /** 丢弃当前录制 (不上传) */
      discardRecord: () => void;
      /** 上传"最近 N 秒"滑动窗口快照. 仅 finished 态可调 */
      reportRecent: () => Promise<RecordingResult | false>;

      // ── 状态查询 ──
      /** 当前态: 'finished' | 'recording' | 'uploading' */
      getState: () => RecordingState;
      /**
       * 订阅录制状态变化, 立即触发一次当前态.
       * 返回 unsubscribe 函数.
       */
      onStateChange: (cb: (state: RecordingState) => void) => () => void;

      // ── 状态枚举常量 (业务方 JS 引用使用) ──
      /** { Finished: 'finished', Recording: 'recording', Uploading: 'uploading' } */
      RecordingState: typeof RECORDING_STATE;
    };
  }
}

window._webTape = {
  configure: configureRRwebToolbox,
  startRecord: startRRwebRecord,
  stopRecord: stopRRwebRecord,
  discardRecord: discardRRwebRecord,
  reportRecent: reportRecentSliding,
  getState: getRecordingState,
  onStateChange: onRecordingStateChange,
  RecordingState: RECORDING_STATE,
};
