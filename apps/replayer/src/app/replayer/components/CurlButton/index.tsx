"use client";

import { FC, MouseEvent } from "react";
import { App, Button } from "antd";
import styles from "./index.module.css";

interface NetworkPayload {
  method?: string;
  url?: string;
  requestHeaders?: Record<string, any> | string | null;
  requestBody?: any;
}

interface CurlButtonProps {
  payload: NetworkPayload;
  className?: string;
}

// shell 单引号转义:包含单引号时,终止当前单引号串、转义单引号、重开单引号
const shellSingleQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

// 将一个 network rrweb 事件 payload 构造成 curl 命令
const buildCurlCommand = (payload: NetworkPayload) => {
  const method = (payload.method || "GET").toUpperCase();
  const url = payload.url || "";
  const parts: string[] = [`curl -X ${method} ${shellSingleQuote(url)}`];

  // headers: 可能是对象或 JSON 字符串
  const rawHeaders = payload.requestHeaders;
  let headers: Record<string, any> | null = null;
  if (rawHeaders) {
    if (typeof rawHeaders === "string") {
      try {
        headers = JSON.parse(rawHeaders);
      } catch {
        headers = null;
      }
    } else if (typeof rawHeaders === "object") {
      headers = rawHeaders;
    }
  }
  if (headers) {
    Object.entries(headers).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      parts.push(`-H ${shellSingleQuote(`${k}: ${String(v)}`)}`);
    });
  }

  // body: 仅对非 GET/HEAD 附加
  if (payload.requestBody && method !== "GET" && method !== "HEAD") {
    const body =
      typeof payload.requestBody === "string"
        ? payload.requestBody
        : JSON.stringify(payload.requestBody);
    parts.push(`--data-raw ${shellSingleQuote(body)}`);
  }

  return parts.join(" \\\n  ");
};

// 复制文本到剪贴板,兼容非 HTTPS 环境
const copyToClipboard = async (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
};

const CurlIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const CurlButton: FC<CurlButtonProps> = ({ payload, className }) => {
  const { message } = App.useApp();

  const handleClick = async (e: MouseEvent) => {
    e.stopPropagation();
    try {
      const curl = buildCurlCommand(payload);
      await copyToClipboard(curl);
      message.success("curl 复制成功");
    } catch {
      message.error("curl 复制失败");
    }
  };

  return (
    <Button
      type="link"
      size="small"
      className={`${styles.curlBtn} ${className || ""}`}
      title="Copy as cURL"
      onClick={handleClick}
      icon={<CurlIcon />}
    >
      curl
    </Button>
  );
};

export default CurlButton;
