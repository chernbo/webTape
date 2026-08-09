/**
 * SDK i18n —— 注入 UI 的多语言文案（默认英文，可切中文）。
 * SDK i18n — messages for the injected UI (English by default, switchable to Chinese).
 *
 * 用法 / Usage:
 *   configure({ locale: 'zh' })            // via npm API
 *   <script src="..." data-locale="zh">    // via IIFE script tag
 *
 * 取词在 DOM 构建时读取当前 locale，所以请在挂载 UI（mountFab / 首次录制）前设置。
 * Strings are resolved when the DOM is built, so set the locale before mounting the UI.
 */

export type SdkLocale = "en" | "zh";

/** 文案 key 集合，en 为基准，zh 必须同构。/ Message keys; en is the source of truth, zh must mirror it. */
interface SdkMessages {
  fabStart: string;
  fabUploadRecent: string;
  confirmTitle: string;
  confirmDesc: string;
  confirmCancel: string;
  confirmOk: string;
  logEndedNotSaved: string;
  logNoRecent: string;
  toastErrorTitle: string;
  toastReport: string;
  toastIgnore: string;
  modalTitle: string;
  modalComplete: string;
  modalSub: string;
  modalLinkLabel: string;
  copied: string;
  close: string;
  openReplay: string;
}

const MESSAGES: Record<SdkLocale, SdkMessages> = {
  en: {
    fabStart: "Start recording",
    fabUploadRecent: "Upload last 60s",
    confirmTitle: "Submit recording",
    confirmDesc: "Submit this recording?",
    confirmCancel: "Cancel",
    confirmOk: "Confirm",
    logEndedNotSaved: "Recording ended but not saved",
    logNoRecent: "[web-tape] No recent recording available to upload",
    toastErrorTitle: "API error detected ({status})",
    toastReport: "Report now",
    toastIgnore: "Ignore",
    modalTitle: "Session Replay",
    modalComplete: "Recording complete",
    modalSub: "Replay link generated — copy and share it with others",
    modalLinkLabel: "Replay link",
    copied: "Copied",
    close: "Close",
    openReplay: "Open replay",
  },
  zh: {
    fabStart: "开始录制",
    fabUploadRecent: "上传最近 60s",
    confirmTitle: "提交录制",
    confirmDesc: "是否提交本次录制信息？",
    confirmCancel: "取消",
    confirmOk: "确认",
    logEndedNotSaved: "录制已结束但未保存",
    logNoRecent: "[web-tape] 暂无可上传的最近录制",
    toastErrorTitle: "检测到接口异常 ({status})",
    toastReport: "一键上报",
    toastIgnore: "忽略",
    modalTitle: "录制回放",
    modalComplete: "录制完成",
    modalSub: "回放链接已生成，可复制分享给他人查看",
    modalLinkLabel: "回放链接",
    copied: "已复制",
    close: "关闭",
    openReplay: "打开回放",
  },
};

// 当前语言，默认英文。/ Current locale, defaults to English.
let current: SdkLocale = "en";

/** 设置 SDK 语言（非法值忽略）。/ Set the SDK locale (invalid values ignored). */
export function setSdkLocale(locale: unknown): void {
  if (locale === "en" || locale === "zh") current = locale;
}

/** 读取当前 SDK 语言。/ Get the current SDK locale. */
export function getSdkLocale(): SdkLocale {
  return current;
}

/**
 * 取词并做 {var} 插值。/ Resolve a message with {var} interpolation.
 * 例 / e.g. t("toastErrorTitle", { status: 500 })
 */
export function t(
  key: keyof SdkMessages,
  vars?: Record<string, string | number>,
): string {
  const tpl = (MESSAGES[current] ?? MESSAGES.en)[key] ?? MESSAGES.en[key];
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
