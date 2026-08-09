/**
 * 录制浮动按钮（FAB）
 *
 * 默认收起一半（右侧半隐），hover 后平滑展开，录制结束后自动收起。
 *
 * 主按钮:正常的"开始录制 → 录制中 → 二次确认 → 上传"流程
 * 子按钮(最近历史):仅在 idle 状态 hover 浮现,
 *   一键上传滑动窗口里"最近 N 秒"录制 (后台一直在录)
 */

import {
  startRRwebRecord,
  stopRRwebRecord,
  discardRRwebRecord,
  reportRecentSliding,
  onRecordingStateChange,
  RECORDING_STATE,
} from "../util";
import { theme } from "./theme";
import { recordingSvg, startSvg, historySvg } from "./icons";
import { formatDuration } from "./dom";
import { showReplayModal } from "./replayModal";
import { t } from "../i18n";

const MAX_RECORDING_DURATION_MS = 3 * 60 * 1000;

const ID_WRAPPER = "web-tape-fab-wrapper";
const ID_FAB     = "web-tape-record-fab";
const ID_HISTORY = "web-tape-history-fab";
const STYLE_ID   = "rrweb-fab-style";

let _onLayoutChange: (() => void) | null = null;

export function createRecordFab(): HTMLElement | null {
  if (document.getElementById(ID_WRAPPER)) return null;

  // ── 样式注入 ──────────────────────────────────
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ID_WRAPPER} {
        position: fixed;
        right: 0;
        bottom: 200px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0;
        transform: translateX(50%);
        transition: transform .3s cubic-bezier(.4,0,.2,1);
      }
      #${ID_WRAPPER}:hover:not(.rrweb-fab-expanded),
      #${ID_WRAPPER}.rrweb-fab-expanded {
        transform: translateX(0);
      }

      /* ── 子按钮:最近历史 (与主按钮同款) ── */
      #${ID_HISTORY} {
        position: relative;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid ${theme.colorBorder};
        background: ${theme.colorBgContainer};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        margin-bottom: 8px;
        opacity: 0;
        transform: translateY(16px) scale(.85);
        pointer-events: none;
        transition: opacity .25s ease, transform .25s ease, box-shadow .2s;
      }
      /* 仅 idle 态 hover 浮现 */
      #${ID_WRAPPER}.rrweb-state-idle:hover #${ID_HISTORY} {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }
      #${ID_HISTORY}:hover {
        box-shadow: 0 6px 16px rgba(0,0,0,0.22);
      }
      #${ID_HISTORY}.rrweb-history-uploading {
        opacity: .6 !important;
        pointer-events: none !important;
      }
      /* 子按钮 tooltip,样式与主按钮 tooltip 完全一致 */
      #${ID_HISTORY}::after {
        content: "${t("fabUploadRecent")}";
        position: absolute;
        right: calc(100% + 12px);
        top: 50%;
        transform: translateY(-50%);
        font-size: ${theme.fontSizeSM}px;
        font-family: ${theme.fontFamily};
        color: #fff;
        background: rgba(0,0,0,.75);
        padding: 4px 10px;
        border-radius: ${theme.borderRadius}px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity .15s;
      }
      #${ID_WRAPPER}.rrweb-state-idle #${ID_HISTORY}:hover::after {
        opacity: 1;
      }

      /* ── 主按钮 ── */
      #${ID_FAB} {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid ${theme.colorBorder};
        background: ${theme.colorBgContainer};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: box-shadow .2s;
      }
      #${ID_FAB}:hover {
        box-shadow: 0 6px 16px rgba(0,0,0,0.22);
      }
      @keyframes rrwebBreathe {
        0%   { box-shadow: 0 0 6px 0   rgba(${theme.colorDanger},.35); }
        50%  { box-shadow: 0 0 12px 6px rgba(${theme.colorDanger},.45); }
        100% { box-shadow: 0 0 6px 0   rgba(${theme.colorDanger},.35); }
      }
      #${ID_FAB}.rrweb-recording {
        animation: rrwebBreathe 1.6s ease-in-out infinite;
      }
      #rrweb-fab-duration {
        font-size: 11px;
        color: #fff;
        background: rgba(0,0,0,.7);
        padding: 1px 6px;
        border-radius: 10px;
        white-space: nowrap;
        pointer-events: none;
        display: none;
        text-align: center;
        margin-top: 4px;
      }
      #rrweb-fab-tooltip {
        position: absolute;
        right: calc(100% + 12px);
        top: 50%;
        transform: translateY(-50%);
        font-size: ${theme.fontSizeSM}px;
        color: #fff;
        background: rgba(0,0,0,.75);
        padding: 4px 10px;
        border-radius: ${theme.borderRadius}px;
        white-space: nowrap;
        pointer-events: none;
        display: none;
        text-align: center;
      }
      @keyframes rrwebLoadingRing { 100% { transform: rotate(1turn); } }
      #rrweb-fab-uploading {
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        background:
          radial-gradient(farthest-side, ${theme.colorWarning} 94%, #0000) top/7px 7px no-repeat,
          conic-gradient(#0000 30%, ${theme.colorWarning});
        -webkit-mask: radial-gradient(farthest-side, #0000 calc(100% - 7px), #000 0);
        animation: rrwebLoadingRing 1s infinite linear;
        pointer-events: none;
        display: none;
      }
      /* ── 二次确认 Popover ── */
      #rrweb-fab-confirm {
        position: absolute;
        right: calc(100% + 12px);
        bottom: 0;
        background: ${theme.colorBgContainer};
        border: 1px solid ${theme.colorBorder};
        border-radius: ${theme.borderRadiusLG}px;
        box-shadow: 0 6px 16px rgba(0,0,0,.12), 0 3px 6px rgba(0,0,0,.08);
        padding: 12px 16px;
        width: 220px;
        font-family: ${theme.fontFamily};
        display: none;
        z-index: 1;
      }
      #rrweb-fab-confirm.rrweb-confirm-visible {
        display: block;
      }
      /* 右侧小箭头 */
      #rrweb-fab-confirm::after {
        content: '';
        position: absolute;
        right: -6px;
        bottom: 12px;
        width: 10px;
        height: 10px;
        background: ${theme.colorBgContainer};
        border-top: 1px solid ${theme.colorBorder};
        border-right: 1px solid ${theme.colorBorder};
        transform: rotate(45deg);
      }
      .rrweb-confirm-title {
        font-size: ${theme.fontSize}px;
        font-weight: 600;
        color: ${theme.colorText};
        margin-bottom: 4px;
      }
      .rrweb-confirm-desc {
        font-size: ${theme.fontSizeSM}px;
        color: ${theme.colorTextSecondary};
        margin-bottom: 12px;
        line-height: 1.5;
      }
      .rrweb-confirm-btns {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .rrweb-confirm-btn {
        padding: 3px 12px;
        font-size: ${theme.fontSizeSM}px;
        border-radius: ${theme.borderRadius}px;
        border: 1px solid ${theme.colorBorder};
        cursor: pointer;
        font-family: ${theme.fontFamily};
        line-height: 1.5714;
        transition: all .2s;
        background: ${theme.colorBgContainer};
        color: ${theme.colorText};
      }
      .rrweb-confirm-btn:hover {
        border-color: ${theme.colorPrimaryHover};
        color: ${theme.colorPrimaryHover};
      }
      .rrweb-confirm-btn-primary {
        background: ${theme.colorPrimary};
        border-color: ${theme.colorPrimary};
        color: #fff;
      }
      .rrweb-confirm-btn-primary:hover {
        background: ${theme.colorPrimaryHover};
        border-color: ${theme.colorPrimaryHover};
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  // ── wrapper ────────────────────────────────────
  const wrapper = document.createElement("div");
  wrapper.id = ID_WRAPPER;
  // 初始为 idle 态 (hover 时可弹"最近历史")
  wrapper.classList.add("rrweb-state-idle");

  // ── 子按钮:最近历史 (主按钮上方) ───────────────
  const historyBtn = document.createElement("button");
  historyBtn.id = ID_HISTORY;
  historyBtn.type = "button";
  historyBtn.innerHTML = historySvg;

  // 按钮容器（相对定位，loading 环绝对覆盖）
  const btnWrap = document.createElement("div");
  btnWrap.style.cssText = "position:relative;width:40px;height:40px;flex-shrink:0";

  const uploading = document.createElement("div");
  uploading.id = "rrweb-fab-uploading";

  const btn = document.createElement("button");
  btn.id = ID_FAB;
  btn.type = "button";
  btn.innerHTML = startSvg;

  // tooltip（绝对定位，不占流）
  const tooltip = document.createElement("div");
  tooltip.id = "rrweb-fab-tooltip";

  // 二次确认 Popover
  const confirmPopover = document.createElement("div");
  confirmPopover.id = "rrweb-fab-confirm";
  confirmPopover.innerHTML = `
    <div class="rrweb-confirm-title">${t("confirmTitle")}</div>
    <div class="rrweb-confirm-desc">${t("confirmDesc")}</div>
    <div class="rrweb-confirm-btns">
      <button class="rrweb-confirm-btn" id="rrweb-confirm-cancel">${t("confirmCancel")}</button>
      <button class="rrweb-confirm-btn rrweb-confirm-btn-primary" id="rrweb-confirm-ok">${t("confirmOk")}</button>
    </div>
  `;

  btnWrap.appendChild(btn);
  btnWrap.appendChild(uploading);
  btnWrap.appendChild(tooltip);
  btnWrap.appendChild(confirmPopover);

  // 计时器（按钮正下方）
  const duration = document.createElement("div");
  duration.id = "rrweb-fab-duration";

  wrapper.appendChild(historyBtn);
  wrapper.appendChild(btnWrap);
  wrapper.appendChild(duration);

  // ── 状态 ──────────────────────────────────────
  let isRecording = false;
  let isUploading = false;
  let isPendingConfirm = false;
  let recordStartTime = 0;
  let frozenElapsed = 0;
  let timerId: number | null = null;

  // ── 状态类切换 (控制子按钮可见性) ──────────────
  const refreshStateClass = () => {
    const idle = !isRecording && !isUploading && !isPendingConfirm;
    wrapper.classList.toggle("rrweb-state-idle", idle);
  };

  // ── 计时器 ────────────────────────────────────
  const stopTimer = () => {
    if (timerId != null) { clearInterval(timerId); timerId = null; }
    duration.style.display = "none";
    duration.textContent = "";
  };

  const pauseTimer = () => {
    if (timerId != null) { clearInterval(timerId); timerId = null; }
    frozenElapsed = Date.now() - recordStartTime;
    duration.textContent = formatDuration(frozenElapsed);
  };

  const startTimer = () => {
    recordStartTime = Date.now();
    frozenElapsed = 0;
    duration.style.display = "block";
    duration.textContent = formatDuration(0);
    if (timerId != null) clearInterval(timerId);
    timerId = window.setInterval(() => {
      const elapsed = Date.now() - recordStartTime;
      if (elapsed >= MAX_RECORDING_DURATION_MS) { openConfirm(); return; }
      duration.textContent = formatDuration(elapsed);
    }, 1000);
  };

  // ── 二次确认 Popover ──────────────────────────
  const openConfirm = () => {
    if (isPendingConfirm) return;
    isPendingConfirm = true;
    refreshStateClass();
    pauseTimer();
    wrapper.classList.add("rrweb-fab-expanded");
    confirmPopover.classList.add("rrweb-confirm-visible");
  };

  const closeConfirm = () => {
    isPendingConfirm = false;
    refreshStateClass();
    confirmPopover.classList.remove("rrweb-confirm-visible");
  };

  const cancelRecording = () => {
    closeConfirm();
    // 丢弃录制，恢复初始状态
    isRecording = false;
    refreshStateClass();
    btn.innerHTML = startSvg;
    btn.classList.remove("rrweb-recording");
    stopTimer();
    wrapper.classList.remove("rrweb-fab-expanded");
    discardRRwebRecord();
  };

  const submitRecording = async () => {
    closeConfirm();
    isRecording = false;
    btn.innerHTML = startSvg;
    btn.classList.remove("rrweb-recording");
    stopTimer();
    wrapper.classList.remove("rrweb-fab-expanded");

    isUploading = true;
    refreshStateClass();
    uploading.style.display = "block";

    const result = await stopRRwebRecord();
    if (result) {
      showReplayModal(result.url);
    } else {
      console.warn(t("logEndedNotSaved"));
    }

    isUploading = false;
    refreshStateClass();
    uploading.style.display = "none";
  };

  confirmPopover.querySelector("#rrweb-confirm-cancel")!.addEventListener("click", (e) => {
    e.stopPropagation();
    cancelRecording();
  });
  confirmPopover.querySelector("#rrweb-confirm-ok")!.addEventListener("click", (e) => {
    e.stopPropagation();
    submitRecording();
  });

  // ── 录制状态切换 ──────────────────────────────
  const startRecording = () => {
    if (isRecording) return;
    isRecording = true;
    refreshStateClass();
    btn.innerHTML = recordingSvg;
    btn.classList.add("rrweb-recording");
    wrapper.classList.add("rrweb-fab-expanded");
    startTimer();
    startRRwebRecord().catch((e) => console.warn("[web-tape] start failed:", e));
  };

  // ── 子按钮: 最近历史一键上传 ──────────────────
  const reportRecent = async () => {
    if (isRecording || isUploading || isPendingConfirm) return;
    isUploading = true;
    refreshStateClass();
    historyBtn.classList.add("rrweb-history-uploading");
    uploading.style.display = "block";
    // 上传期间保持展开, 否则 wrapper 收起后 loading 环被裁到屏幕外
    wrapper.classList.add("rrweb-fab-expanded");
    try {
      const result = await reportRecentSliding();
      if (result) {
        showReplayModal(result.url);
      } else {
        console.warn(t("logNoRecent"));
      }
    } finally {
      isUploading = false;
      refreshStateClass();
      historyBtn.classList.remove("rrweb-history-uploading");
      uploading.style.display = "none";
      wrapper.classList.remove("rrweb-fab-expanded");
    }
  };

  historyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    void reportRecent();
  });

  // ── 事件绑定 ──────────────────────────────────
  // 主按钮 tooltip:仅 hover 主按钮时显示,避免与子按钮 tooltip 同时出现
  btn.addEventListener("mouseenter", () => {
    if (isPendingConfirm || isRecording || isUploading) return;
    tooltip.textContent = t("fabStart");
    tooltip.style.display = "block";
  });
  btn.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
  });

  btn.addEventListener("click", () => {
    if (isUploading || isPendingConfirm) return;
    if (!isRecording) { startRecording(); return; }
    openConfirm();
  });

  // scroll/resize 时 wrapper 是 fixed 不需要重新定位，仅保留接口兼容
  const onLayoutChange = () => {};
  if (_onLayoutChange) {
    window.removeEventListener("scroll", _onLayoutChange);
    window.removeEventListener("resize", _onLayoutChange);
  }
  _onLayoutChange = onLayoutChange;

  // ── 订阅全局录制状态: 哨兵/外部调用 reportRecent 时同步 FAB loading ──
  onRecordingStateChange((state) => {
    if (state === RECORDING_STATE.Uploading && !isRecording) {
      // 外部触发了上传 (哨兵 toast 的"一键上报"), FAB 也要体现 loading
      if (!isUploading) {
        isUploading = true;
        refreshStateClass();
        uploading.style.display = "block";
        wrapper.classList.add("rrweb-fab-expanded");
      }
    } else if (state === RECORDING_STATE.Finished && isUploading && !isRecording) {
      // 上传完成, 恢复 FAB
      isUploading = false;
      refreshStateClass();
      uploading.style.display = "none";
      wrapper.classList.remove("rrweb-fab-expanded");
    }
  });

  document.body.appendChild(wrapper);
  return btn;
}

// ─── 销毁 FAB ────────────────────────────────────────

export function removeRecordFab(): void {
  if (_onLayoutChange) {
    window.removeEventListener("scroll", _onLayoutChange);
    window.removeEventListener("resize", _onLayoutChange);
    _onLayoutChange = null;
  }
  document.getElementById(ID_WRAPPER)?.remove();
}
