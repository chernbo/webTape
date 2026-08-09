"use client";

/**
 * DraggableFloatMenu
 * 风格参考 Next.js dev tools indicator：小圆形胶囊按钮，hover 展开菜单。
 * 拖拽中跟手无动画，松手后 spring 弹性吸附到最近角落。
 */

import { useEffect, useRef, useState } from "react";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import { useTheme } from "../../context/ThemeContext";
import styles from "./index.module.css";
import { FormOutlined } from "@ant-design/icons";

// 距离屏幕边缘的基础间距（px）
const EDGE_PADDING = 20;
// 右侧额外间距，避免与滚动条或系统按钮重叠（px）
const RIGHT_EDGE_PADDING = 50;
// 底部额外间距，为菜单展开预留空间（px）
const BOTTOM_EDGE_PADDING = 140;
// 主按钮直径（px）
const BTN_SIZE = 36;

type Corner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

const getCornerPos = (corner: Corner) => {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const rightX = W - BTN_SIZE - RIGHT_EDGE_PADDING;
  const leftX = EDGE_PADDING;
  switch (corner) {
    // 右下角：底部预留菜单展开空间
    case "bottom-right":
      return { x: rightX, y: H - BTN_SIZE - BOTTOM_EDGE_PADDING };
    // 左下角：底部预留菜单展开空间
    case "bottom-left":
      return { x: leftX, y: H - BTN_SIZE - BOTTOM_EDGE_PADDING };
    // 右上角：贴右贴顶
    case "top-right":
      return { x: rightX, y: EDGE_PADDING };
    // 左上角：贴左贴顶
    case "top-left":
      return { x: leftX, y: EDGE_PADDING };
  }
};

const nearestCorner = (x: number, y: number): Corner => {
  const cx = x < window.innerWidth / 2;
  const cy = y < window.innerHeight / 2;
  if (cx && cy) return "top-left";
  if (!cx && cy) return "top-right";
  if (cx && !cy) return "bottom-left";
  return "bottom-right";
};

const DraggableFloatMenu = () => {
  const { mode, setMode } = useTheme();
  const nodeRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [corner, setCorner] = useState<Corner>("bottom-right");
  const currentCorner = useRef<Corner>("bottom-right");

  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 判断是否在右侧
  const isRight = corner.endsWith("right");

  // 客户端挂载后初始化到右下角
  useEffect(() => {
    setPos(getCornerPos("bottom-right"));
  }, []);

  // 窗口 resize 时跟随当前角落重新定位
  useEffect(() => {
    const onResize = () => {
      setIsSnapping(false);
      setPos(getCornerPos(currentCorner.current));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 点击外部收起菜单
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (nodeRef.current && !nodeRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const handleStart = () => {
    setIsSnapping(false);
    setIsDragging(false);
  };

  const handleDrag = (_: DraggableEvent, data: DraggableData) => {
    setIsDragging(true);
    setOpen(false);
    setPos({ x: data.x, y: data.y });
  };

  const handleStop = (_: DraggableEvent, data: DraggableData) => {
    const newCorner = nearestCorner(data.x, data.y);
    currentCorner.current = newCorner;
    setCorner(newCorner);
    setIsSnapping(true);
    setPos(getCornerPos(newCorner));
    setTimeout(() => setIsDragging(false), 100);
  };

  const handleBtnClick = () => {
    if (!isDragging) setOpen((v) => !v);
  };

  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
      position={pos}
      onStart={handleStart}
      onDrag={handleDrag}
      onStop={handleStop}
      bounds="body"
    >
      <div
        ref={nodeRef}
        className={`${styles.root} ${isRight ? styles.rootRight : styles.rootLeft}`}
        style={{
          transition: isSnapping
            ? "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "none",
        }}
      >
        {/* 主触发按钮 */}
        <button
          className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
          onClick={handleBtnClick}
          title="Theme"
        >
          {mode === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>

        {/* 展开的菜单项，始终向下展开 */}
        <div className={`${styles.menu} ${open ? styles.menuOpen : ""}`}>
          <button
            className={`${styles.menuItem} ${styles.menuItemLight} ${mode === "light" ? styles.menuItemActive : ""}`}
            onClick={() => {
              setMode("light");
              setOpen(false);
            }}
            title="Light theme"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <span>Light</span>
          </button>
          <button
            className={`${styles.menuItem} ${styles.menuItemDark} ${mode === "dark" ? styles.menuItemActive : ""}`}
            onClick={() => {
              setMode("dark");
              setOpen(false);
            }}
            title="Dark theme"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
            </svg>
            <span>Dark</span>
          </button>
          <a
            className={`${styles.menuItem} ${styles.menuItemDoc}`}
            href="https://your-feedback-doc.example.com"
            target="_blank"
            rel="noopener noreferrer"
            title="反馈文档"
            onClick={() => setOpen(false)}
          >
            <FormOutlined />
            <span>FeedBack</span>
          </a>
        </div>
      </div>
    </Draggable>
  );
};

export default DraggableFloatMenu;
