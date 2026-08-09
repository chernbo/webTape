/**
 * Web Tape —— `<script>` (IIFE) 全局 API 类型声明
 *
 * 仅供**通过 CDN / <script> 引入**、且希望有类型提示的 TS 项目参考。
 * （npm 方式 `import ... from '@webtapejs/toolbox'` 自带类型，无需本文件。）
 *
 * 用法:
 *   1) 拷贝本文件到你的项目 types/ 目录, 或直接 reference:
 *      /// <reference path="./web-tape.d.ts" />
 *   2) TS 项目可直接用类型:
 *      window._webTape?.onStateChange((s) => { ... });
 *   3) JS 项目可用枚举常量:
 *      if (state === window._webTape.RecordingState.Recording) { ... }
 *
 * 本声明与 SDK 运行时 API 保持一致；如与实际行为不符，以 npm 包类型
 * (@webtapejs/toolbox 的 dist/index.d.ts) 为准。
 */

/** 录制状态机 */
export type RecordingState = "finished" | "recording" | "uploading";

/** 录制状态枚举常量, 与 RecordingState 字符串字面量等价 */
export interface RecordingStateEnum {
  /** 待录制 / 录制结束 (含丢弃后), 也是初始态 */
  readonly Finished: "finished";
  /** 主动录制中 */
  readonly Recording: "recording";
  /** 上传中 (stopRecord / reportRecent 的 fetch resolve 前) */
  readonly Uploading: "uploading";
}

/** 录制上传成功的返回结构 */
export interface RecordingResult {
  /** 32 位 hex 标识, 用于关联其他业务数据 */
  sourceId: string;
  /** 完整回放链接 (含 host), 业务方可直接展示 / 复制 */
  url: string;
}

/** 哨兵忽略名单. urls / statusCodes 任一命中则不弹 toast. */
export interface ErrorPromptIgnore {
  /** URL 子串 (substring) 或正则, 任一匹配即忽略. 子串匹配大小写敏感. */
  urls?: Array<string | RegExp>;
  /** 状态码精确匹配, 任一相等即忽略. */
  statusCodes?: number[];
}

/** SDK 注入 UI 的语言 / Locale of the injected UI */
export type SdkLocale = "en" | "zh";

/** configure() 的入参 */
export interface WebTapeConfig {
  /**
   * 录屏上传后端地址 (回放服务 /api/replayer 的完整 URL).
   * 生产接入 **必须** 指定, 否则数据会发往构建期默认地址而丢失.
   */
  serverUrl?: string;
  /**
   * 注入 UI 的语言, 默认 'en'. / Locale of the injected UI, defaults to 'en'.
   * 也可用 `<script src="..." data-locale="zh">` 在加载期设置。
   * Can also be set at load time via `<script src="..." data-locale="zh">`.
   */
  locale?: SdkLocale;
  /** 是否自动开启后台滑动录制 (默认 true), 用于"最近 N 秒"快速上报 */
  autoBackgroundRecord?: boolean;
  /** 滑动窗口长度 ms, 默认 30000 */
  backgroundWindowMs?: number;
  /**
   * 哨兵模式: 检测到 HTTP >= 400 时自动弹通知引导上报最近现场.
   * 默认 false (业务方主动开). 同时只显示一个 toast, 连续错误天然去重.
   */
  errorPrompt?: boolean;
  /** 哨兵模式忽略名单 —— 命中任一规则的错误不弹 toast (urls 与 statusCodes 为 OR 关系). */
  errorPromptIgnore?: ErrorPromptIgnore;
}

/** `window._webTape` 暴露的全局 API */
export interface WebTapeAPI {
  /**
   * 注入运行时配置. 通常登录态完成后调一次, 不要每次渲染都调.
   * 多次调用浅合并 (后覆盖前).
   */
  configure: (config: WebTapeConfig) => void;

  /** 开始手动录制. 仅 finished 态可调, 其它态直接 return 不抛错. */
  startRecord: () => Promise<void>;

  /**
   * 停止录制并上传完整事件. recording → uploading → finished.
   * @returns { sourceId, url }; 不在 recording 态返回 false.
   */
  stopRecord: () => Promise<RecordingResult | false>;

  /** 丢弃当前录制 (不上传). recording → finished 直通. */
  discardRecord: () => void;

  /**
   * 上传"最近 N 秒"滑动窗口快照 (默认 30s, 由 backgroundWindowMs 控制).
   * 适合用户没提前开录但出问题, 一键事后回溯.
   * @returns { sourceId, url }; 不在 finished 态或 buffer 为空返回 false.
   */
  reportRecent: () => Promise<RecordingResult | false>;

  /** 同步取当前录制状态 (快照, 非响应式). */
  getState: () => RecordingState;

  /** 订阅状态变化, 订阅时立即触发一次当前态; 返回 unsubscribe 函数. */
  onStateChange: (cb: (state: RecordingState) => void) => () => void;

  /** 录制状态枚举常量. */
  RecordingState: RecordingStateEnum;
}

declare global {
  interface Window {
    _webTape?: WebTapeAPI;
  }
}

export {};
