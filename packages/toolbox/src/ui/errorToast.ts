/**
 * 哨兵模式: 接口异常通知 toast
 *
 * 触发: networkXhrInterceptor 命中 5xx / 408 → util/index.ts 调 showErrorToast
 * 行为:
 *   - 单例: 同时只显示一个, 已有时直接 return (天然去重连续错误)
 *   - 锚 FAB 子按钮的左侧
 *   - 6s 倒计时 + 进度条 (参考 antd Notification 设计)
 *   - "一键上报" 按钮触发 reportRecent 上传最近 60s
 *   - 关闭/忽略/超时 自动消失
 */

import type { NetworkErrorInfo } from "../util/networkXhrInterceptor";

const STYLE_ID = "web-tape-error-toast-style";
const TOAST_ID = "web-tape-error-toast";
const DURATION_MS = 6000;

let activeToast: HTMLElement | null = null;

const css = `
  #${TOAST_ID} {
    position: fixed;
    z-index: 2147483647;
    width: 280px;
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    box-shadow: 0 6px 16px 0 rgba(0,0,0,.08), 0 3px 6px -4px rgba(0,0,0,.12), 0 9px 28px 8px rgba(0,0,0,.05);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
    animation: web-tape-toast-in .25s cubic-bezier(.215,.61,.355,1);
  }
  @keyframes web-tape-toast-in {
    from { opacity: 0; transform: translateX(8px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  #${TOAST_ID}.web-tape-toast-out {
    animation: web-tape-toast-out .2s cubic-bezier(.55,.06,.68,.19) forwards;
  }
  @keyframes web-tape-toast-out {
    to { opacity: 0; transform: translateX(8px); }
  }
  #${TOAST_ID} .wt-toast-body {
    padding: 14px 16px 12px;
    display: flex;
    gap: 10px;
  }
  #${TOAST_ID} .wt-toast-icon {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #ff4d4f;
    color: #fff;
    font-size: 12px;
    line-height: 18px;
    text-align: center;
    font-weight: bold;
    font-family: -apple-system, sans-serif;
  }
  #${TOAST_ID} .wt-toast-main {
    flex: 1;
    min-width: 0;
  }
  #${TOAST_ID} .wt-toast-title {
    font-size: 13px;
    font-weight: 600;
    color: #262626;
    margin-bottom: 4px;
    line-height: 1.4;
  }
  #${TOAST_ID} .wt-toast-desc {
    font-size: 11px;
    color: #8c8c8c;
    line-height: 1.4;
    margin-bottom: 10px;
    word-break: break-all;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  #${TOAST_ID} .wt-toast-actions {
    display: flex;
    gap: 6px;
  }
  #${TOAST_ID} .wt-toast-btn {
    flex: 1;
    padding: 4px 10px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    background: #fff;
    font-size: 12px;
    cursor: pointer;
    color: #595959;
    transition: all .15s;
  }
  #${TOAST_ID} .wt-toast-btn:hover {
    border-color: #ff7875;
    color: #ff7875;
  }
  #${TOAST_ID} .wt-toast-btn-primary {
    background: #ff4d4f;
    border-color: #ff4d4f;
    color: #fff;
  }
  #${TOAST_ID} .wt-toast-btn-primary:hover {
    background: #ff7875;
    border-color: #ff7875;
    color: #fff;
  }
  #${TOAST_ID} .wt-toast-close {
    position: absolute;
    top: 6px;
    right: 8px;
    width: 18px;
    height: 18px;
    border: 0;
    background: transparent;
    color: #bfbfbf;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0;
  }
  #${TOAST_ID} .wt-toast-close:hover { color: #595959; }
  #${TOAST_ID} .wt-toast-progress {
    height: 2px;
    background: #fff1f0;
    overflow: hidden;
  }
  #${TOAST_ID} .wt-toast-progress-bar {
    height: 100%;
    width: 100%;
    background: #ff4d4f;
    transform-origin: left center;
    animation: web-tape-progress ${DURATION_MS}ms linear forwards;
  }
  @keyframes web-tape-progress {
    from { transform: scaleX(1); }
    to   { transform: scaleX(0); }
  }
`;

function injectStyleOnce() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.className = "rr-block"; // rrweb 不录此节点
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname + (u.search ? u.search.slice(0, 40) : "");
  } catch {
    return url.slice(0, 80);
  }
}

/** 锚到 FAB 子按钮的左侧; FAB 不存在时退到右下角 */
function positionToast(el: HTMLElement) {
  const fab = document.getElementById("web-tape-fab-wrapper");
  if (fab) {
    const rect = fab.getBoundingClientRect();
    el.style.right = `${window.innerWidth - rect.left + 12}px`;
    el.style.bottom = `${window.innerHeight - rect.bottom}px`;
  } else {
    el.style.right = "16px";
    el.style.bottom = "16px";
  }
}

/**
 * 展示错误通知 toast.
 * @param info  网络错误信息
 * @param onAction  用户点击"一键上报"时调
 */
export function showErrorToast(
  info: NetworkErrorInfo,
  onAction: () => Promise<unknown> | unknown,
) {
  if (typeof document === "undefined") return;
  // 单例去重: 已有 toast 显示中, 跳过 (天然处理连续错误)
  if (activeToast) return;

  injectStyleOnce();

  const el = document.createElement("div");
  el.id = TOAST_ID;
  el.className = "rr-block"; // toast 自身不被 rrweb 录入
  el.innerHTML = `
    <button class="wt-toast-close" type="button" aria-label="close">×</button>
    <div class="wt-toast-body">
      <div class="wt-toast-icon">!</div>
      <div class="wt-toast-main">
        <div class="wt-toast-title">检测到接口异常 (${info.status})</div>
        <div class="wt-toast-desc">${info.method} ${shortenUrl(info.url)}</div>
        <div class="wt-toast-actions">
          <button class="wt-toast-btn wt-toast-btn-primary" type="button">一键上报</button>
          <button class="wt-toast-btn wt-toast-btn-ignore" type="button">忽略</button>
        </div>
      </div>
    </div>
    <div class="wt-toast-progress"><div class="wt-toast-progress-bar"></div></div>
  `;
  positionToast(el);
  document.body.appendChild(el);
  activeToast = el;

  let closed = false;
  const timer = window.setTimeout(close, DURATION_MS);

  function close() {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    el.classList.add("web-tape-toast-out");
    setTimeout(() => {
      el.remove();
      if (activeToast === el) activeToast = null;
    }, 200);
  }

  el.querySelector(".wt-toast-close")?.addEventListener("click", close);
  el.querySelector(".wt-toast-btn-ignore")?.addEventListener("click", close);
  el.querySelector(".wt-toast-btn-primary")?.addEventListener("click", async () => {
    close();
    try {
      await onAction();
    } catch (e) {
      console.warn("[web-tape] error report action threw:", e);
    }
  });

  // 视口变化时跟随重定位 (FAB 位置是 fixed, 但保险一下)
  const reposition = () => positionToast(el);
  window.addEventListener("resize", reposition);
  setTimeout(() => window.removeEventListener("resize", reposition), DURATION_MS + 500);
}
