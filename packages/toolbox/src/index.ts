/**
 * @webtapejs/toolbox —— npm 包入口 (库模式)
 *
 * 与 IIFE 入口 (src/ui/uiEmbed.ts) 的区别:
 *   - IIFE:  <script> 引入即自动挂 FAB + 启动后台录制 + 注册 window._webTape (有副作用)
 *   - 本入口: 只导出 API, 不产生任何副作用. 何时启动、是否渲染 UI 完全由接入方决定.
 *
 * 典型用法:
 *   import { configure, startRecord, stopRecord } from '@webtapejs/toolbox'
 *
 *   configure({
 *     serverUrl: 'https://your-replayer.example.com/api/replayer', // 必填: 你的回放服务地址
 *     autoBackgroundRecord: true,
 *     errorPrompt: true,
 *   })
 *
 * 需要内置悬浮按钮 (FAB) 的话, 单独引入:
 *   import { mountFab } from '@webtapejs/toolbox'
 *   mountFab()
 */

export {
  configureRRwebToolbox as configure,
  startBackgroundRecord,
  stopBackgroundRecord,
  startRRwebRecord as startRecord,
  stopRRwebRecord as stopRecord,
  discardRRwebRecord as discardRecord,
  reportRecentSliding as reportRecent,
  getRecordingState as getState,
  onRecordingStateChange as onStateChange,
  getRRwebToolboxConfig as getConfig,
  RECORDING_STATE,
  type WebTapeConfig,
  type ErrorPromptIgnore,
  type RecordingState,
  type RecordingResult,
} from "./util";

/**
 * 挂载内置悬浮录制按钮 (FAB). 可选 —— 只有需要开箱 UI 的接入方才调用.
 * 不调用则完全静默, 由接入方自渲染 UI + 调 startRecord/stopRecord 等 API.
 */
export async function mountFab(): Promise<void> {
  const { createRecordFab } = await import("./ui/recordFab");
  createRecordFab();
}
