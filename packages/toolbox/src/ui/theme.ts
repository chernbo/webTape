/**
 * RRWeb Toolbox 主题色变量
 *
 * 集中管理所有 UI 组件的颜色，修改此处即可全局切换主题。
 * 颜色命名参考 Ant Design Token 体系。
 */

export const theme = {
  // ── 品牌主色（Primary）──────────────────────────
  /** 主色 - 默认态 */
  colorPrimary: "#1677ff",
  /** 主色 - 悬浮态 */
  colorPrimaryHover: "#4096ff",
  /** 主色 - 按下态 */
  colorPrimaryActive: "#0958d9",
  /** 主色 - 按钮阴影 */
  colorPrimaryShadow: "rgba(5,145,255,.1)",

  // ── 成功色（Success）────────────────────────────
  /** 成功色 - 默认态 */
  colorSuccess: "#52c41a",
  /** 成功色 - 浅底背景 */
  colorSuccessBg: "#f6ffed",

  // ── 危险/录制色（Danger）─────────────────────────
  /** 录制呼吸动画色 */
  colorDanger: "255,77,79", // rgb 值，方便用于 rgba()

  // ── 警告/加载色（Warning）────────────────────────
  /** 上传 loading 色 */
  colorWarning: "#ffa516",

  // ── 中性色（Neutral）────────────────────────────
  /** 标题文字色 */
  colorText: "rgba(0,0,0,.88)",
  /** 次要文字色 */
  colorTextSecondary: "rgba(0,0,0,.65)",
  /** 说明文字色 */
  colorTextTertiary: "rgba(0,0,0,.45)",
  /** 边框色 */
  colorBorder: "#d9d9d9",
  /** 分割线色 */
  colorSplit: "rgba(5,5,5,.06)",
  /** 填充色 - 浅 */
  colorFillQuaternary: "rgba(0,0,0,.02)",
  /** 遮罩色 */
  colorMask: "rgba(0,0,0,.45)",
  /** hover 背景色 */
  colorFillHover: "rgba(0,0,0,.06)",

  // ── 背景 ───────────────────────────────────────
  /** 组件背景色 */
  colorBgContainer: "#fff",
  /** 聚光灯背景 */
  colorBgSpotlight: "rgba(0,0,0,.85)",

  // ── 圆角 ───────────────────────────────────────
  /** 基础圆角 */
  borderRadius: 6,
  /** 大圆角（弹窗） */
  borderRadiusLG: 8,

  // ── 字号 ───────────────────────────────────────
  fontSize: 14,
  fontSizeLG: 16,
  fontSizeXL: 20,
  fontSizeSM: 12,

  // ── 字体 ───────────────────────────────────────
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif",
} as const;

/** 主题色类型 */
export type Theme = typeof theme;
