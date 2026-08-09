"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu } from "antd";
import { ArrowLeftOutlined, VerticalAlignTopOutlined } from "@ant-design/icons";
import styles from "./page.module.css";

// ─── 代码块 ──────────────────────────────────────
function CodeBlock({ code, lang = "js" }: { code: string; lang?: string }) {
  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeBlockHeader}>
        <span className={styles.codeLang}>{lang}</span>
      </div>
      <pre className={styles.codePre}><code>{code}</code></pre>
    </div>
  );
}

// ─── 参数表格行 ──────────────────────────────────
function ParamRow({ name, type, required, defaultVal, desc }: {
  name: string; type: string; required?: boolean; defaultVal?: string; desc: string;
}) {
  return (
    <tr>
      <td>
        <code className={styles.paramName}>{name}</code>
        {required && <span className={styles.required}>required</span>}
      </td>
      <td><code className={styles.paramType}>{type}</code></td>
      <td>{defaultVal ?? "—"}</td>
      <td>{desc}</td>
    </tr>
  );
}

// 使用者请替换成自己部署的 web-tape.iife.js CDN 地址
const TOOLBOX_URL = "https://your-cdn.example.com/web-tape.iife.js";

// ─── 导航结构（用于 antd Menu） ───────────────────
const NAV_ITEMS = [
  {
    key: "g-overview",
    label: "概览",
    type: "group" as const,
    children: [
      { key: "overview", label: "简介" },
      { key: "choose-mode", label: "选择接入模式" },
    ],
  },
  {
    key: "g-fab",
    label: "模式一：FAB 注入",
    children: [
      { key: "fab-intro", label: "什么是 FAB 注入" },
      { key: "fab-install", label: "安装" },
      { key: "fab-configure", label: "configure() 配置" },
      { key: "fab-sentinel", label: "哨兵模式" },
    ],
  },
  {
    key: "g-api",
    label: "模式二：Core API",
    children: [
      { key: "api-intro", label: "什么是 Core API" },
      { key: "api-install", label: "安装" },
      { key: "api-start-stop", label: "startRecord / stopRecord" },
      { key: "api-discard", label: "discardRecord" },
      { key: "api-recent", label: "reportRecent" },
      { key: "api-state", label: "getState / onStateChange" },
    ],
  },
  {
    key: "g-roadmap",
    label: "后期计划",
    type: "group" as const,
    children: [
      { key: "roadmap", label: "功能规划" },
    ],
  },
];

const ALL_IDS = [
  "overview", "choose-mode",
  "fab-intro", "fab-install", "fab-configure", "fab-sentinel",
  "api-intro", "api-install", "api-start-stop", "api-discard", "api-recent", "api-state",
  "roadmap",
];

const DEFAULT_OPEN_KEYS = ["g-fab", "g-api"];

export default function GuidePage() {
  const [activeId, setActiveId] = useState("overview");
  const [showTop, setShowTop] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isScrollingTo = useRef(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      setShowTop(el.scrollTop > 300);
      if (isScrollingTo.current) return; // 程序驱动滚动期间不更新高亮
      for (let i = ALL_IDS.length - 1; i >= 0; i--) {
        const sec = el.querySelector(`#${ALL_IDS[i]}`);
        if (sec && (sec as HTMLElement).offsetTop - 80 <= el.scrollTop) {
          setActiveId(ALL_IDS[i]);
          break;
        }
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = contentRef.current;
    if (!el) return;
    const target = el.querySelector(`#${id}`);
    if (target) {
      isScrollingTo.current = true;
      setActiveId(id);
      el.scrollTo({ top: (target as HTMLElement).offsetTop - 24, behavior: "smooth" });
      // smooth scroll 结束后再开放 scroll 事件（smooth 通常 ~500ms）
      setTimeout(() => { isScrollingTo.current = false; }, 600);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.headerBack}>
          <ArrowLeftOutlined />
          <span>返回首页</span>
        </Link>
        <div className={styles.headerTitle}>
          <span className={styles.headerBrand}>Web Tape</span>
          <span className={styles.headerSep}>/</span>
          <span>使用指南</span>
        </div>
      </header>

      <div className={styles.layout}>
        {/* 左侧导航 — 支持左右折叠 */}
        <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}>
          <button
            className={styles.sidebarToggle}
            onClick={() => setSidebarCollapsed((v) => !v)}
            title={sidebarCollapsed ? "展开导航" : "收起导航"}
          >
            {sidebarCollapsed ? "›" : "‹"}
          </button>
          {!sidebarCollapsed && (
            <Menu
              mode="inline"
              selectedKeys={[activeId]}
              defaultOpenKeys={DEFAULT_OPEN_KEYS}
              items={NAV_ITEMS}
              className={styles.menu}
              onClick={({ key }) => scrollTo(key)}
              style={{ border: "none", background: "transparent" }}
            />
          )}
        </aside>

        {/* 右侧内容 */}
        <main className={styles.content} ref={contentRef}>

          <section id="overview" className={styles.section}>
            <h1 className={styles.h1}>Web Tape 使用指南</h1>
            <p className={styles.lead}>
              Web Tape 是一款轻量级 Bug 现场录制 SDK，通过一行脚本即可在任意 Web 应用中注入录制能力。
              录制内容包括用户操作轨迹、网络请求、Console 日志，生成可分享的回放链接，帮助产研团队精准定位问题。
            </p>
          </section>

          <section id="choose-mode" className={styles.section}>
            <h2 className={styles.h2}>选择接入模式</h2>
            <p className={styles.prose}>Web Tape 提供两种接入模式，根据你的场景选择合适的方式：</p>
            <div className={styles.modeCards}>
              <div className={styles.modeCard}>
                <div className={styles.modeCardBadge}>模式一</div>
                <div className={styles.modeCardTitle}>FAB 注入</div>
                <div className={styles.modeCardDesc}>
                  最快接入方式。注入一行脚本后，页面右下角自动出现悬浮录制按钮（FAB），
                  内置哨兵模式，接口异常时自动弹出一键上报提示。
                  <span className={styles.modeCardDescBold}>适合快速上手，无需改动业务代码。</span>
                </div>
                <div className={styles.modeCardWhen}>
                  <span className={styles.whenLabel}>触发方式</span>
                  默认行为，省略 <code>data-builtin-fab</code> 或设为 <code>true</code>
                </div>
              </div>
              <div className={styles.modeCard}>
                <div className={styles.modeCardBadge} style={{ background: "#eff6ff", color: "#2563eb" }}>模式二</div>
                <div className={styles.modeCardTitle}>Core API</div>
                <div className={styles.modeCardDesc}>
                  完全自定义模式。通过 <code>window._webTape</code> 暴露的 API
                  控制录制时机、绑定自定义 UI，灵活集成到业务流程中。
                  <span className={styles.modeCardDescBold}>适合深度定制交互要求，自定义交互体验。</span>
                </div>
                <div className={styles.modeCardWhen}>
                  <span className={styles.whenLabel}>触发方式</span>
                  脚本标签加 <code>data-builtin-fab=&quot;false&quot;</code>
                </div>
              </div>
            </div>
          </section>

          <div className={styles.divider} />

          <section id="fab-intro" className={styles.section}>
            <h2 className={styles.h2}>模式一：FAB 注入</h2>
            <h3 className={styles.h3}>什么是 FAB 注入</h3>
            <p className={styles.prose}>
              FAB（Floating Action Button）注入模式是最零侵入的接入方式。
              加载脚本后，SDK 自动在页面右下角渲染一个悬浮操作按钮，提供完整的录制交互 UI，
              用户无需了解任何 API 即可完成录制和上报。
            </p>
            <div className={styles.featureList}>
              <div className={styles.featureItem}><span className={styles.featureDot} />悬浮按钮一键开始 / 停止录制</div>
              <div className={styles.featureItem}><span className={styles.featureDot} />后台持续录制最近 N 秒滑动窗口</div>
              <div className={styles.featureItem}><span className={styles.featureDot} />哨兵模式：接口异常自动弹出上报提示</div>
              <div className={styles.featureItem}><span className={styles.featureDot} />录制完成自动上传并生成回放链接</div>
            </div>
          </section>

          <section id="fab-install" className={styles.section}>
            <h3 className={styles.h3}>安装</h3>
            <p className={styles.prose}>
              在测试环境入口组件中动态注入脚本，推荐通过环境变量控制是否加载。
              SDK 通过 <code>&lt;script&gt;</code> 标签的 <code>data-builtin-fab</code> 属性决定是否挂载内置 FAB：
              <strong> 省略或设为 </strong><code>true</code> 时自动显示悬浮录制按钮；设为 <code>false</code> 时静默加载，仅暴露 <code>window._webTape</code> API，适合自渲染 UI 场景。
            </p>
            <CodeBlock lang="jsx (React / Vue)" code={`// web-tape：仅测试环境加载，且只加载一次
// React: 放在入口组件的 useEffect(() => { ... }, [])
// Vue:   放在入口组件的 onMounted(() => { ... })
if (isEnableTestTool) {
  const src = '${TOOLBOX_URL}';
  if (document.querySelector(\`script[src="\${src}"]\`)) return;

  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  // 自渲染 UI 时取消注释：
  // script.dataset.builtinFab = 'false';
  document.head.appendChild(script);
}`} />
            <p className={styles.tip}>
              💡 后台滑动录制两种模式下都会自动启动，无论是否显示 FAB。
            </p>
          </section>

          <section id="fab-configure" className={styles.section}>
            <h3 className={styles.h3}>configure() — 运行时配置</h3>
            <p className={styles.prose}>
              脚本加载完成后，通过 <code>window._webTape.configure()</code> 注入运行时配置：
            </p>
            <CodeBlock lang="js" code={`window._webTape?.configure({
  backgroundWindowMs: 60_000,   // 后台滑动窗口时长，此处设为 60s（SDK 默认 30s）
  errorPrompt: true,            // 开启哨兵模式（默认 false）
  errorPromptIgnore: {
    statusCodes: [404, 499],
    urls: ['/health', /\\/ping/]
  }
});`} />
            <table className={styles.paramTable}>
              <thead>
                <tr><th>参数</th><th>类型</th><th>默认值</th><th>说明</th></tr>
              </thead>
              <tbody>
                <ParamRow name="backgroundWindowMs" type="number" defaultVal="30000" desc="后台滑动窗口时长（毫秒）。⚠️ 值越大内存占用越高，建议不超过 60000" />
                <ParamRow name="errorPrompt" type="boolean" defaultVal="false" desc="是否开启哨兵模式，检测到 HTTP ≥ 400 时自动弹出上报提示" />
                <ParamRow name="errorPromptIgnore.statusCodes" type="number[]" defaultVal="—" desc="忽略指定状态码，不触发哨兵弹窗" />
                <ParamRow name="errorPromptIgnore.urls" type="(string | RegExp)[]" defaultVal="—" desc="忽略匹配 URL 的请求，子串或正则均可" />
                <ParamRow name="autoBackgroundRecord" type="boolean" defaultVal="true" desc="是否自动开启后台录制。⚠️ 设为 true 会持续在内存中维护事件缓冲，若无需回溯可设 false 关闭" />
              </tbody>
            </table>
            <div className={styles.calloutWarn}>
              <span className={styles.calloutStrong}>⚠️ 性能说明</span>
              <ul className={styles.calloutList}>
                <li className={styles.calloutItem}><code>backgroundWindowMs</code> 控制内存中保留的事件量，窗口越长占用越多；仅在测试环境使用，建议 ≤ 60s。</li>
                <li className={styles.calloutItem}><code>autoBackgroundRecord: true</code>（默认）会持续监听 DOM 变更并缓冲事件。若业务场景只需手动录制、不需要回溯，可设为 <code>false</code> 完全关闭后台录制。</li>
                <li className={styles.calloutItem}>SDK 仅录制 DOM 事件，不执行截图或视频编码，整体开销远小于 canvas 录制方案。</li>
              </ul>
            </div>
            <h4 className={styles.h4}>WebTapeConfig 类型</h4>
            <CodeBlock lang="ts" code={`interface WebTapeConfig {
  autoBackgroundRecord?: boolean;  // 是否自动开启后台录制，默认 true
  backgroundWindowMs?: number;     // 滑动窗口时长（毫秒），默认 30000
  errorPrompt?: boolean;           // 是否开启哨兵模式，默认 false
  errorPromptIgnore?: {
    urls?: (string | RegExp)[];
    statusCodes?: number[];
  };
}`} />
          </section>

          <section id="fab-sentinel" className={styles.section}>
            <h3 className={styles.h3}>哨兵模式</h3>
            <p className={styles.prose}>
              开启 <code>errorPrompt: true</code> 后，SDK 拦截所有 HTTP 请求。
              检测到状态码 ≥ 400 时，自动在右下角弹出通知 toast，引导用户一键上报现场。
            </p>
            <div className={styles.callout}>
              <span className={styles.calloutStrong}>行为说明</span>
              <ul className={styles.calloutList}>
                <li className={styles.calloutItem}>同时只显示一个 toast，连续错误自动去重</li>
                <li className={styles.calloutItem}>toast 6 秒后自动消失</li>
                <li className={styles.calloutItem}>录制中 / 上传中状态下不弹出（避免打扰）</li>
                <li className={styles.calloutItem}>可通过 <code>errorPromptIgnore</code> 排除健康检查等无害接口</li>
              </ul>
            </div>
          </section>

          <div className={styles.divider} />

          <section id="api-intro" className={styles.section}>
            <h2 className={styles.h2}>模式二：Core API</h2>
            <h3 className={styles.h3}>什么是 Core API</h3>
            <p className={styles.prose}>
              Core API 模式下，你完全掌控录制时机和 UI 交互。
              SDK 加载后通过 <code>window._webTape</code> 暴露所有核心方法，
              可集成到任意业务按钮、反馈入口或自动化流程中。
            </p>
            <div className={styles.featureList}>
              <div className={styles.featureItem}><span className={styles.featureDot} />不依赖内置 FAB UI，自定义触发点</div>
              <div className={styles.featureItem}><span className={styles.featureDot} />完整状态机：finished → recording → uploading</div>
              <div className={styles.featureItem}><span className={styles.featureDot} />支持订阅状态变化，驱动自定义 UI 渲染</div>
              <div className={styles.featureItem}><span className={styles.featureDot} />可与业务逻辑深度结合（如表单提交失败自动上报）</div>
            </div>
          </section>

          <section id="api-install" className={styles.section}>
            <h3 className={styles.h3}>安装</h3>
            <p className={styles.prose}>与 FAB 模式相同脚本，加 <code>data-builtin-fab="false"</code> 后加载：</p>
            <CodeBlock lang="js" code={`const script = document.createElement('script');
script.src = '${TOOLBOX_URL}';
script.async = true;
script.dataset.builtinFab = 'false'; // 不挂 FAB
document.head.appendChild(script);`} />
            <p className={styles.prose}>加载后通过 <code>window._webTape</code> 访问所有 API：</p>
            <CodeBlock lang="js" code={`const tape = window._webTape;
if (tape) {
  tape.configure({ backgroundWindowMs: 60_000, errorPrompt: true });
}`} />
          </section>

          <section id="api-start-stop" className={styles.section}>
            <h3 className={styles.h3}>startRecord() / stopRecord()</h3>
            <p className={styles.prose}>手动控制录制的开始和结束：</p>
            <CodeBlock lang="ts" code={`// 开始录制（仅 finished 态可调）
await window._webTape.startRecord();

// 停止录制并上传
const result = await window._webTape.stopRecord();
// 返回 RecordingResult | false

if (result) {
  console.log('回放链接:', result.url);   // 完整回放 URL
  console.log('录制 ID:', result.sourceId); // 32 位 hex
}`} />
            <table className={styles.paramTable}>
              <thead>
                <tr><th>方法</th><th>返回值</th><th>说明</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><code className={styles.paramName}>startRecord()</code></td>
                  <td><code className={styles.paramType}>Promise&lt;void&gt;</code></td>
                  <td>开始录制，状态切换到 <code>recording</code></td>
                </tr>
                <tr>
                  <td><code className={styles.paramName}>stopRecord()</code></td>
                  <td><code className={styles.paramType}>Promise&lt;RecordingResult | false&gt;</code></td>
                  <td>停止并上传，成功返回结果对象，失败返回 <code>false</code></td>
                </tr>
              </tbody>
            </table>
            <h4 className={styles.h4}>RecordingResult 类型</h4>
            <CodeBlock lang="ts" code={`interface RecordingResult {
  sourceId: string; // 32 位 hex 录制标识
  url: string;      // 完整回放链接，可直接分享给研发
}`} />
          </section>

          <section id="api-discard" className={styles.section}>
            <h3 className={styles.h3}>discardRecord()</h3>
            <p className={styles.prose}>丢弃当前录制内容，不上传，状态直接回到 <code>finished</code>：</p>
            <CodeBlock lang="ts" code={`window._webTape.discardRecord();`} />
          </section>

          <section id="api-recent" className={styles.section}>
            <h3 className={styles.h3}>reportRecent()</h3>
            <p className={styles.prose}>
              上报后台滑动窗口最近 <code>backgroundWindowMs</code> 毫秒的快照，
              <span className={styles.calloutStrong}>无需提前手动开录</span>。
              适合表单提交失败、接口超时等场景的自动上报：
            </p>
            <CodeBlock lang="ts" code={`async function onSubmitError() {
  const result = await window._webTape.reportRecent();
  // 返回 RecordingResult | false
  if (result) {
    submitBugReport({ replayUrl: result.url });
  }
}`} />
            <div className={styles.callout}>
              仅在 <code>finished</code> 态可调；<code>recording</code> / <code>uploading</code> 态返回 <code>false</code>。
            </div>
          </section>

          <section id="api-state" className={styles.section}>
            <h3 className={styles.h3}>getState() / onStateChange()</h3>
            <p className={styles.prose}>查询当前状态或订阅状态变化，用于驱动自定义 UI：</p>
            <CodeBlock lang="ts" code={`// 同步读取当前状态
const state = window._webTape.getState();

// 订阅状态变化（立即触发一次当前状态）
const unsubscribe = window._webTape.onStateChange((state) => {
  if (state === 'recording') {
    myBtn.textContent = '⏹ 停止录制';
  } else if (state === 'uploading') {
    myBtn.textContent = '上传中...';
    myBtn.disabled = true;
  } else {
    myBtn.textContent = '▶ 开始录制';
    myBtn.disabled = false;
  }
});

unsubscribe(); // 组件卸载时取消订阅`} />
            <h4 className={styles.h4}>RecordingState 类型</h4>
            <CodeBlock lang="ts" code={`type RecordingState =
  | 'finished'   // 待机中（初始态 / 录制结束后）
  | 'recording'  // 录制中
  | 'uploading'; // 上传中`} />
          </section>

          <div className={styles.divider} />

          <section id="roadmap" className={styles.section}>
            <h2 className={styles.h2}>后期计划</h2>
            <p className={styles.prose}>
              Web Tape 当前已具备完整的录制、回放、哨兵上报能力。后续将围绕「降低反馈门槛、提升问题定位效率」持续演进，以下是近期重点规划方向：
            </p>
            <div className={styles.roadmapList}>
              <div className={styles.roadmapItem}>
                <div className={styles.roadmapIcon} style={{ background: "#eff6ff", color: "#2563eb" }}>🤖</div>
                <div>
                  <div className={styles.roadmapTitle}>AI 深度探索</div>
                  <div className={styles.roadmapDesc}>
                    在现有 AI 摘要基础上，将录制数据（操作序列、网络请求、Console 日志）结构化为标准化的用户操作路径描述，
                    输出为 AI Agent 可直接消费的格式。Agent 读取这份路径数据后，能够自动模拟用户操作步骤完成问题复现，
                    实现从「人工看回放」到「Agent 自动复现 → 定位根因」的跨越，大幅缩短研发介入时间。
                  </div>
                </div>
              </div>
              <div className={styles.roadmapItem}>
                <div className={styles.roadmapIcon} style={{ background: "#fdf2f8", color: "#9333ea" }}>📱</div>
                <div>
                  <div className={styles.roadmapTitle}>多端支持</div>
                  <div className={styles.roadmapDesc}>
                    探索H5 / 小程序 等移动端相应用的录制能力，统一多端的 Bug 上报体验，
                    让移动端问题也能像 Web 端一样获得完整的操作现场回放。
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.callout} style={{ marginTop: 20 }}>
              有想法或需求？欢迎随时联系，一起探索更多可能。
            </div>
          </section>

          {/* Footer */}
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
              Built by <span className={styles.footerSignBold}>Chern</span> · 2026
            </div>
          </footer>
        </main>
      </div>

      {showTop && (
        <button className={styles.backTop} onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })} title="返回顶部">
          <VerticalAlignTopOutlined className={styles.backTopIcon} />
          <span className={styles.backTopText}>顶部</span>
        </button>
      )}
    </div>
  );
}
