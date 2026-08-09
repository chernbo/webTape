/**
 * 回放弹窗组件
 *
 * 职责：录制完成后展示结果弹窗（成功提示 + 回放链接 + 复制 / 打开）。
 * 样式注入 + DOM 构建 + 交互逻辑自包含。
 */

import { theme } from "./theme";
import { videoSvg, closeSvg, copySvg, successCircleSvg } from "./icons";
import { copyToClipboard, injectStyleOnce } from "./dom";

// ─── 弹窗样式 ───────────────────────────────────────────

const MODAL_STYLE_ID = "rrweb-replay-modal-style";

function getModalCSS(): string {
  return `
@keyframes rrwebModalFadeIn{from{opacity:0}to{opacity:1}}
@keyframes rrwebModalSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes rrwebCheckDraw{to{stroke-dashoffset:0}}
@keyframes rrwebCheckCircle{0%{transform:scale(0);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
@keyframes rrwebCopiedToast{0%{opacity:0;transform:translateX(-50%) translateY(4px)}15%{opacity:1;transform:translateX(-50%) translateY(0)}85%{opacity:1;transform:translateX(-50%) translateY(0)}100%{opacity:0;transform:translateX(-50%) translateY(-4px)}}
.rrweb-modal-overlay{position:fixed;inset:0;background:${theme.colorMask};display:flex;align-items:center;justify-content:center;z-index:2147483647;animation:rrwebModalFadeIn .2s ease}
.rrweb-modal-dialog{background:${theme.colorBgContainer};border-radius:${theme.borderRadiusLG}px;box-shadow:0 6px 16px 0 rgba(0,0,0,.08),0 3px 6px -4px rgba(0,0,0,.12),0 9px 28px 8px rgba(0,0,0,.05);max-width:472px;width:calc(100% - 32px);animation:rrwebModalSlideUp .3s cubic-bezier(.33,1,.68,1);font-family:${theme.fontFamily};font-size:${theme.fontSize}px;color:${theme.colorText};line-height:1.5714}
.rrweb-modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid ${theme.colorSplit}}
.rrweb-modal-header-title{display:flex;align-items:center;gap:8px;font-weight:600;font-size:${theme.fontSizeLG}px;color:${theme.colorText}}
.rrweb-modal-close{width:32px;height:32px;border-radius:4px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:${theme.colorTextTertiary};font-size:${theme.fontSizeLG}px;transition:background .2s,color .2s;flex-shrink:0}
.rrweb-modal-close:hover{background:${theme.colorFillHover};color:${theme.colorText}}
.rrweb-modal-body{padding:24px}
.rrweb-modal-result{text-align:center;padding:0 0 20px}
.rrweb-modal-result-icon{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;margin-bottom:12px;animation:rrwebCheckCircle .4s cubic-bezier(.33,1,.68,1) .1s both}
.rrweb-modal-result-icon svg circle{fill:none;stroke:${theme.colorSuccess};stroke-width:2}
.rrweb-modal-result-icon svg polyline{fill:none;stroke:${theme.colorSuccess};stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:20;stroke-dashoffset:20;animation:rrwebCheckDraw .35s ease .45s forwards}
.rrweb-modal-result-title{font-size:${theme.fontSizeXL}px;font-weight:600;color:${theme.colorText};margin:0 0 4px}
.rrweb-modal-result-sub{font-size:${theme.fontSize}px;color:${theme.colorTextTertiary};margin:0}
.rrweb-modal-label{font-size:${theme.fontSize}px;font-weight:500;color:${theme.colorText};margin-bottom:8px}
.rrweb-modal-url-box{display:flex;align-items:center;gap:8px;background:${theme.colorFillQuaternary};border:1px solid ${theme.colorBorder};border-radius:${theme.borderRadius}px;padding:8px 12px;transition:border-color .2s}
.rrweb-modal-url-box:hover{border-color:${theme.colorPrimaryHover}}
.rrweb-modal-url-link{flex:1;min-width:0;font-size:${theme.fontSize}px;color:${theme.colorPrimary};word-break:break-all;text-decoration:none;line-height:1.5714;transition:color .2s}
.rrweb-modal-url-link:hover{color:${theme.colorPrimaryHover}}
.rrweb-modal-copy-btn{flex-shrink:0;width:32px;height:32px;border-radius:${theme.borderRadius}px;border:1px solid ${theme.colorBorder};background:${theme.colorBgContainer};cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;position:relative;color:${theme.colorTextTertiary}}
.rrweb-modal-copy-btn:hover{border-color:${theme.colorPrimary};color:${theme.colorPrimary}}
.rrweb-modal-copy-btn:hover svg path{fill:${theme.colorPrimary}}
.rrweb-modal-copy-btn:active{border-color:${theme.colorPrimaryActive};color:${theme.colorPrimaryActive}}
.rrweb-modal-copy-toast{position:absolute;top:-36px;left:50%;transform:translateX(-50%);background:${theme.colorBgSpotlight};color:#fff;font-size:${theme.fontSizeSM}px;padding:4px 12px;border-radius:${theme.borderRadius}px;white-space:nowrap;pointer-events:none;animation:rrwebCopiedToast 1.6s ease forwards;box-shadow:0 6px 16px rgba(0,0,0,.08)}
.rrweb-modal-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 24px;border-top:1px solid ${theme.colorSplit}}
.rrweb-modal-btn{height:32px;padding:0 15px;border-radius:${theme.borderRadius}px;font-size:${theme.fontSize}px;font-weight:400;cursor:pointer;transition:all .2s;outline:none;line-height:1.5714}
.rrweb-modal-btn-default{border:1px solid ${theme.colorBorder};background:${theme.colorBgContainer};color:${theme.colorText}}
.rrweb-modal-btn-default:hover{border-color:${theme.colorPrimaryHover};color:${theme.colorPrimaryHover}}
.rrweb-modal-btn-default:active{border-color:${theme.colorPrimaryActive};color:${theme.colorPrimaryActive}}
.rrweb-modal-btn-primary{border:1px solid transparent;background:${theme.colorPrimary};color:#fff;box-shadow:0 2px 0 ${theme.colorPrimaryShadow}}
.rrweb-modal-btn-primary:hover{background:${theme.colorPrimaryHover}}
.rrweb-modal-btn-primary:active{background:${theme.colorPrimaryActive}}
`;
}

// ─── 构建弹窗 DOM ────────────────────────────────────────

export function showReplayModal(url: string): void {
  // 注入样式（仅一次）
  injectStyleOnce(MODAL_STYLE_ID, getModalCSS());

  // ── 遮罩 ──────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.id = "web-tape-replay-overlay";
  overlay.className = "rrweb-modal-overlay";

  // ── 弹窗容器 ──────────────────────────────────
  const dialog = document.createElement("div");
  dialog.className = "rrweb-modal-dialog";

  // ── 头部 ──────────────────────────────────────
  const header = document.createElement("div");
  header.className = "rrweb-modal-header";

  const headerTitle = document.createElement("div");
  headerTitle.className = "rrweb-modal-header-title";
  headerTitle.innerHTML = `${videoSvg}录制回放`;

  const closeIcon = document.createElement("button");
  closeIcon.className = "rrweb-modal-close";
  closeIcon.innerHTML = closeSvg;

  header.appendChild(headerTitle);
  header.appendChild(closeIcon);

  // ── 内容区域 ──────────────────────────────────
  const body = document.createElement("div");
  body.className = "rrweb-modal-body";

  // 成功结果区
  const result = document.createElement("div");
  result.className = "rrweb-modal-result";
  result.innerHTML = `
    <div class="rrweb-modal-result-icon">
      ${successCircleSvg(theme.colorSuccessBg, theme.colorSuccess)}
    </div>
    <p class="rrweb-modal-result-title">录制完成</p>
    <p class="rrweb-modal-result-sub">回放链接已生成，可复制分享给他人查看</p>
  `;

  // 链接区域
  const label = document.createElement("div");
  label.className = "rrweb-modal-label";
  label.textContent = "回放链接";

  const urlBox = document.createElement("div");
  urlBox.className = "rrweb-modal-url-box";

  const link = document.createElement("a");
  link.href = url;
  link.textContent = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.className = "rrweb-modal-url-link";

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "rrweb-modal-copy-btn";
  copyBtn.innerHTML = copySvg;

  copyBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(url).then(() => {
      const existing = copyBtn.querySelector(".rrweb-modal-copy-toast");
      if (existing) existing.remove();
      const toast = document.createElement("span");
      toast.className = "rrweb-modal-copy-toast";
      toast.textContent = "已复制";
      copyBtn.appendChild(toast);
      setTimeout(() => toast.remove(), 1700);
    });
  });

  urlBox.appendChild(link);
  urlBox.appendChild(copyBtn);

  body.appendChild(result);
  body.appendChild(label);
  body.appendChild(urlBox);

  // ── 底部按钮 ──────────────────────────────────
  const footer = document.createElement("div");
  footer.className = "rrweb-modal-footer";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "关闭";
  closeBtn.className = "rrweb-modal-btn rrweb-modal-btn-default";

  const openBtn = document.createElement("button");
  openBtn.textContent = "打开回放";
  openBtn.className = "rrweb-modal-btn rrweb-modal-btn-primary";

  // ── 关闭动画 ──────────────────────────────────
  const closeOverlay = () => {
    overlay.style.opacity = "0";
    dialog.style.transform = "translateY(12px)";
    dialog.style.opacity = "0";
    dialog.style.transition = "all .2s ease";
    overlay.style.transition = "opacity .2s ease";
    setTimeout(() => overlay.remove(), 220);
  };

  closeIcon.addEventListener("click", closeOverlay);
  closeBtn.addEventListener("click", closeOverlay);
  openBtn.addEventListener("click", () => {
    window.open(url, "_blank", "noreferrer");
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOverlay();
  });

  footer.appendChild(closeBtn);
  footer.appendChild(openBtn);

  // ── 组装 ──────────────────────────────────────
  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(footer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}
