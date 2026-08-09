"use client";

import Link from "next/link";
import { useState } from "react";
import { Tabs, Button, message } from "antd";
import {
  CopyOutlined,
  CheckOutlined,
  PlayCircleOutlined,
  BookOutlined,
  VideoCameraOutlined,
  ExperimentOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import styles from "./page.module.css";

// 使用者请替换成自己部署的 web-tape.iife.js CDN 地址
const TOOLBOX_URL = "https://your-cdn.example.com/web-tape.iife.js";
const MANUAL_SCRIPT = `<script src="${TOOLBOX_URL}"></script>`;

const REACT_SNIPPET = `// web-tape：仅测试环境加载，且只加载一次
useEffect(() => {
  if (isEnableTestTool) {
    const src = '${TOOLBOX_URL}';

    if (document.querySelector(\`script[src="\${src}"]\`)) {
      return;
    }

    const script = document.createElement('script');

    script.src = src;
    script.async = true;
    document.head.appendChild(script);
  }
}, []);`;


const AGENT_PROMPT = `帮我安装 Web Tape 会话录制工具:

【重要】执行前请先判断当前页面是否为测试 / 预发环境:
- 域名包含 test / dev / staging / pre / qa 等关键字, 或为本地 localhost / 127.0.0.1 视为测试环境, 可直接注入
- 若域名疑似生产环境 (例如不包含上述关键字、或为正式对外域名), 必须先与我二次确认, 严禁直接注入

确认是测试环境后, 在页面 <head> 末尾注入以下脚本:
${MANUAL_SCRIPT}

注入完成后刷新页面, 确认右下角出现录制悬浮按钮即视为成功。`;

// 极简 HTML 语法高亮:仅区分 标签 / 属性名 / 字符串
const highlightHtml = (code: string) => {
  const parts: Array<{ type: string; text: string }> = [];
  const regex =
    /(&lt;\/?)([a-zA-Z][\w-]*)|([a-zA-Z-]+)(=)("[^"]*")|(&lt;|&gt;|\/&gt;)/g;
  const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(escaped)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "plain",
        text: escaped.slice(lastIndex, match.index),
      });
    }
    if (match[2]) {
      parts.push({ type: "punct", text: match[1] });
      parts.push({ type: "tag", text: match[2] });
    } else if (match[3]) {
      parts.push({ type: "attr", text: match[3] });
      parts.push({ type: "punct", text: match[4] });
      parts.push({ type: "string", text: match[5] });
    } else if (match[6]) {
      parts.push({ type: "punct", text: match[6] });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < escaped.length) {
    parts.push({ type: "plain", text: escaped.slice(lastIndex) });
  }
  return parts;
};

// Prompt 高亮:中括号告警 / 行首标记 / URL
const highlightPrompt = (code: string) => {
  const lines = code.split("\n");
  return lines.map((line, lineIdx) => {
    const segments: Array<{ type: string; text: string }> = [];
    const regex =
      /(【[^】]+】)|(<script[^>]*><\/script>)|(https?:\/\/[^\s]+)|(^- )/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: "plain",
          text: line.slice(lastIndex, match.index),
        });
      }
      if (match[1]) segments.push({ type: "warn", text: match[1] });
      else if (match[2]) segments.push({ type: "tag", text: match[2] });
      else if (match[3]) segments.push({ type: "string", text: match[3] });
      else if (match[4]) segments.push({ type: "bullet", text: match[4] });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < line.length) {
      segments.push({ type: "plain", text: line.slice(lastIndex) });
    }
    return { line: segments, key: lineIdx };
  });
};

export default function Home() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      message.success("已复制到剪贴板");
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch {
      message.error("复制失败,请手动选择文本");
    }
  };

  const renderHtmlCode = (content: string) => (
    <pre className={styles.code}>
      <code>
        {highlightHtml(content).map((part, i) => (
          <span
            key={i}
            className={styles[`tk_${part.type}`]}
            dangerouslySetInnerHTML={{ __html: part.text }}
          />
        ))}
      </code>
    </pre>
  );

  const renderPromptCode = (content: string) => (
    <pre className={styles.code}>
      <code>
        {highlightPrompt(content).map((row, i) => (
          <div key={i} className={styles.codeLine}>
            {row.line.length === 0 ? (
              <span>&nbsp;</span>
            ) : (
              row.line.map((seg, j) => (
                <span key={j} className={styles[`tk_${seg.type}`]}>
                  {seg.text}
                </span>
              ))
            )}
          </div>
        ))}
      </code>
    </pre>
  );

  const renderCodeBox = (
    label: string,
    content: string,
    btnText: string,
    key: string,
    type: "html" | "prompt",
  ) => (
    <div className={styles.codeBox}>
      <div className={styles.codeBoxHeader}>
        <span className={styles.codeDots} aria-hidden>
          <i style={{ background: "#ff5f57" }} />
          <i style={{ background: "#febc2e" }} />
          <i style={{ background: "#28c840" }} />
        </span>
        <span className={styles.codeLabel}>{label}</span>
      </div>
      {type === "html" ? renderHtmlCode(content) : renderPromptCode(content)}
      <div className={styles.copyWrapper}>
        <Button
          type="primary"
          size="large"
          icon={copiedKey === key ? <CheckOutlined /> : <CopyOutlined />}
          onClick={() => handleCopy(content, key)}
          className={styles.copyBtn}
        >
          {copiedKey === key ? "已复制" : btnText}
        </Button>
      </div>
    </div>
  );

  const tabItems = [
    {
      key: "react",
      label: "手动安装",
      children: (
        <div className={styles.tabPane}>
          <p className={styles.subTip}>
            <strong className={styles.warn}>请勿在生产环境注入。</strong>
            在测试环境入口组件中动态加载脚本，刷新后即可在页面右下角看到录制按钮。Vue 项目将 <code>useEffect</code> 替换为 <code>onMounted</code> 即可。
          </p>
          {renderCodeBox(
            "React / Vue",
            REACT_SNIPPET,
            "复制代码",
            "manual-react",
            "prompt",
          )}
        </div>
      ),
    },
    {
      key: "agent",
      label: "通过 AI Agent 安装",
      children: (
        <div className={styles.tabPane}>
          <p className={styles.subTip}>
            将下方提示词复制给你的 AI 助手(Claude Code、Codex、Cursor、Trae
            等),它会自动判断是否测试环境并完成安装。
          </p>
          {renderCodeBox(
            "提示词",
            AGENT_PROMPT,
            "复制提示词",
            "agent",
            "prompt",
          )}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <main className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logoRow}>
            <span className={styles.logoMark} aria-hidden>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect
                  x="3"
                  y="7"
                  width="30"
                  height="22"
                  rx="3"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                />
                <circle cx="12" cy="18" r="3" fill="#0f172a" />
                <circle cx="24" cy="18" r="3" fill="#0f172a" />
                <path
                  d="M3 13 L33 13"
                  stroke="#0f172a"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="29" cy="9.5" r="1.2" fill="#ef4444" />
              </svg>
            </span>
            <span className={styles.brand}>Web Tape</span>
          </div>
          <h1 className={styles.title}>
            升级用户反馈渠道，加速产研定位问题
          </h1>
          <p className={styles.subtitle}>
            Web Tape 是一款 Bug 现场还原工具，自动录制用户操作轨迹、网络请求与控制台日志，内置哨兵模式在接口异常时自动捕获最近 60s 现场并一键上报，支持在回放过程中评论标注、cURL 一键复制与 AI 自动总结信息摘要，生成可分享的回放链接，提升用户反馈体验，加速产研问题定位。
          </p>

          {/* 主 CTA:让用户一眼就能找到入口 */}
          <div className={styles.ctaRow}>
            <a
              href="/experience"
              className={styles.ctaPrimary}
            >
              <PlayCircleOutlined />
              <span>前往体验</span>
            </a>
            <Link
              href="/guide"
              className={styles.ctaSecondary}
            >
              <BookOutlined />
              <span>使用指南</span>
            </Link>
          </div>

          <div className={styles.featureRow}>
            <span className={styles.featurePill}>🚨 哨兵模式 · 异常自动上报</span>
            <span className={styles.featurePill}>⏱ 零操作采集 · 自动捕获最近 60s</span>
               <span className={styles.featurePill}>📼 全覆盖 · 操作、网络和 Console 实时回放</span>
            <span className={styles.featurePill}>✏️ 回放批注 · 回放可评论标注</span>
            <span className={styles.featurePill}>🤖 AI摘要 · 总结提炼信息摘要</span>
            <span className={styles.featurePill}>🔗 一键分享 · 快速分发回放链接</span>
          </div>
        </div>



        {/* 三步上手 */}
        <div className={styles.steps}>
          <div className={styles.stepCard}>
            <div
              className={styles.stepIcon}
              style={{ background: "#eff6ff", color: "#2563eb" }}
            >
              <ExperimentOutlined />
            </div>
            <div className={styles.stepIndex}>STEP 01</div>
            <div className={styles.stepTitle}>注入脚本</div>
            <div className={styles.stepDesc}>
              测试环境一行 script，或交给 AI Agent 自动注入，无需改动业务代码
            </div>
          </div>
          <div className={styles.stepArrow} aria-hidden>
            →
          </div>
          <div className={styles.stepCard}>
            <div
              className={styles.stepIcon}
              style={{ background: "#fef2f2", color: "#dc2626" }}
            >
              <VideoCameraOutlined />
            </div>
            <div className={styles.stepIndex}>STEP 02</div>
            <div className={styles.stepTitle}>录制 Bug 现场</div>
            <div className={styles.stepDesc}>
              点击悬浮按钮开始录制；接口异常时也会自动弹提示，一键上报最近 60s 现场
            </div>
          </div>
          <div className={styles.stepArrow} aria-hidden>
            →
          </div>
          <div className={styles.stepCard}>
            <div
              className={styles.stepIcon}
              style={{ background: "#ecfdf5", color: "#059669" }}
            >
              <ShareAltOutlined />
            </div>
            <div className={styles.stepIndex}>STEP 03</div>
            <div className={styles.stepTitle}>分享 · 精准复现</div>
            <div className={styles.stepDesc}>
              发送回放链接给研发，时间轴 + 圈选标注 + cURL 复现，还能交给 AI 直接分析根因
            </div>
          </div>
        </div>

        <div className={styles.tabsCard}>
          <Tabs
            defaultActiveKey="react"
            items={tabItems}
            centered
            size="large"
            className={styles.tabs}
          />
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerBrand}>Web Tape</div>
          <div className={styles.footerStack}>
            <span>rrweb 2.0</span>
            <span>Next.js 16</span>
            <span>TypeScript</span>
            <span>Ant Design 6</span>
            <span>AI Workflow</span>
            <span>MIT</span>
          </div>
          <div className={styles.footerSign}>
            Built by <strong>Chern</strong> · 2026
          </div>
        </footer>
      </main>
    </div>
  );
}
