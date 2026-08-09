"use client";

/**
 * JsonTreeView — 可折叠 JSON 树形展示组件
 * 基于 @textea/json-viewer，主题跟随全局 ThemeContext 自动切换
 */

import dynamic from "next/dynamic";
import { useTheme } from "../../context/ThemeContext";

const JsonViewer = dynamic(
  () => import("@textea/json-viewer").then((m) => m.JsonViewer),
  { ssr: false },
);

interface JsonTreeViewProps {
  value: unknown;
  /** 根节点名称，默认不显示 */
  rootName?: string | false;
  /** 默认展开层级，默认 2 */
  defaultInspectDepth?: number;
}

const darkTheme = {
  scheme: "custom-dark",
  base00: "#1a1a1a",
  base01: "#252525",
  base02: "#2d2d2d",
  base03: "#6b6b6b",
  base04: "#9d9d9d",
  base05: "#d4d4d4",
  base06: "#e0e0e0",
  base07: "#ffffff",
  base08: "#f48771",
  base09: "#ce9178",
  base0A: "#cca700",
  base0B: "#89d185",
  base0C: "#4fc1ff",
  base0D: "#9cdcfe",
  base0E: "#c586c0",
  base0F: "#d7ba7d",
};

const lightTheme = {
  scheme: "custom-light",
  base00: "#ffffff",
  base01: "#f5f5f5",
  base02: "#e8e8e8",
  base03: "#999999",
  base04: "#666666",
  base05: "#333333",
  base06: "#222222",
  base07: "#000000",
  base08: "#d32f2f",
  base09: "#795548",
  base0A: "#e65100",
  base0B: "#2e7d32",
  base0C: "#0078d4",
  base0D: "#0078d4",
  base0E: "#7b1fa2",
  base0F: "#5d4037",
};

const JsonTreeView = ({
  value,
  rootName = false,
  defaultInspectDepth = 2,
}: JsonTreeViewProps) => {
  const { mode } = useTheme();
  const colorScheme = mode === "dark" ? darkTheme : lightTheme;

  return (
    <JsonViewer
      value={value}
      rootName={rootName}
      theme={colorScheme}
      defaultInspectDepth={defaultInspectDepth}
      displayDataTypes={false}
      displaySize={false}
      enableClipboard={false}
      style={{
        background: "transparent",
        fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
        fontSize: 12,
        padding: 0,
      }}
    />
  );
};

export default JsonTreeView;
