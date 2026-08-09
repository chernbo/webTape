"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import styles from "./style/index.module.scss";
import {
  ImperativePanelHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import RRwebPlayer from "./components/RrwebPlayer";
import RRwebTimeLine from "./components/RRwebTimeLine";
import MonitorNetworkPanel from "./components/MonitorNetworkPanel";
import ConsoleLogPanel from "./components/ConsoleLogPanel";
import { App, Skeleton } from "antd";
import { ThemeProvider } from "./context/ThemeContext";
import DraggableFloatMenu from "./components/DraggableFloatMenu";
import AiAnalysis from "./components/AiAnalysis";
import AnnotationLayer from "./components/AnnotationLayer";
import AnnotationToolbar from "./components/AnnotationToolbar";
import AnnotationSidebar from "./components/AnnotationSidebar";
import useEvents from "./hooks/useEvents";
import useAnnotations from "./hooks/useAnnotations";
import type { AnnotationColor } from "./types/annotation";
import { MessageOutlined } from "@ant-design/icons";

const ReplayPageClient = () => {
  // useSearchParams 属于"只能在浏览器环境里真正拿到值"的东西，区分服务端渲染需要包裹Suspense
  const searchParams = useSearchParams();

  const sourceId = searchParams.get("sourceId") || "";
  const [rrwebPlayerInstance, setRrwebPlayerInstance] = useState<any | null>(null);
  const { data: events } = useEvents(sourceId);

  const { annotations, add, update, remove } = useAnnotations(sourceId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState<AnnotationColor>("red");
  // 侧边栏状态: 派生逻辑
  //   用户没操作过 (null)  → 由 annotations 是否非空决定
  //   用户主动开/关        → 用用户的选择
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const sidebarOpen =
    userToggled !== null ? userToggled : annotations.length > 0;
  const setSidebarOpen = setUserToggled;

  // 侧边栏打开时, ESC 关闭
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen, setSidebarOpen]);

  const viewDomRef = useRef<ImperativePanelHandle>(null);
  const [replayLayout, setReplayLayout] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const measureReplayLayout = () => {
    const panelId = viewDomRef.current?.getId();
    const el = panelId
      ? document.querySelector<HTMLElement>(`[data-panel-id="${panelId}"]`)
      : null;
    if (el) {
      const rect = el.getBoundingClientRect();
      setReplayLayout({ width: rect.width, height: rect.height });
    }
  };

  // 先清空再下一帧重设，强制重启 pin 的 pulse 动画（重复点击同一批注也能闪烁）
  const flashActive = (id: string) => {
    setActiveId(null);
    requestAnimationFrame(() => setActiveId(id));
  };

  // 跳转到某时刻并暂停（点击批注统一入口）
  const gotoAndPause = (timestamp: number) => {
    // 第二个参数 isPlaying=false 表示跳转后不自动播放
    rrwebPlayerInstance?.goto?.(timestamp, false);
    rrwebPlayerInstance?.pause?.();
  };

  // 点击画面任意位置：暂停 + 用当前选中色落 pin
  const handlePlace = (x: number, y: number, timestamp: number) => {
    rrwebPlayerInstance?.pause?.();
    const a = add({
      timestamp,
      x,
      y,
      comment: "",
      color: currentColor,
    });
    setSidebarOpen(true);
    flashActive(a.id);
  };

  const handleAnnotationActivate = (
    id: string,
    timestamp: number,
  ) => {
    gotoAndPause(timestamp);
    flashActive(id);
    setSidebarOpen(true);
  };

  // 删除时同步清掉 activeId,避免色板继续指向已删除的批注 id
  // 否则点击切色板会走 update(已删id) 分支,变成静默 no-op
  const handleRemove = (id: string) => {
    remove(id);
    if (activeId === id) setActiveId(null);
  };

  const isLoading = !rrwebPlayerInstance;

  return (
    <div className={styles.wrapper}>
      <PanelGroup direction="vertical" onLayout={() => measureReplayLayout()}>
        <Panel defaultSize={40} minSize={10}>
          {isLoading ? (
            <div className={styles.skeletonPanel}>
              <Skeleton active paragraph={{ rows: 8 }} />
            </div>
          ) : (
            <div className={styles.monitorNetwork}>
              <MonitorNetworkPanel
                sourceId={sourceId}
                rrwebPlayerInstance={rrwebPlayerInstance}
              />
            </div>
          )}
        </Panel>
        <PanelResizeHandle
          className={`${styles.resizeHandle} ${isDragging ? styles.resizeHandleActive : ""}`}
          onDragging={setIsDragging}
        />
        <Panel defaultSize={60} minSize={30}>
          <PanelGroup
            direction="horizontal"
            onLayout={() => measureReplayLayout()}
          >
            <Panel ref={viewDomRef} defaultSize={50} minSize={30}>
              {replayLayout.width ? (
                <div className={styles.playerWrapper}>
                  <RRwebPlayer
                    getRrwebPlayerInstance={(r) => setRrwebPlayerInstance(r)}
                    sourceId={sourceId}
                    replayLayout={replayLayout}
                  />
                  <AnnotationLayer
                    annotations={annotations}
                    activeId={activeId}
                    rrwebPlayerInstance={rrwebPlayerInstance}
                    onPlace={handlePlace}
                    onPinClick={(id) => {
                      const a = annotations.find((x) => x.id === id);
                      if (a) handleAnnotationActivate(a.id, a.timestamp);
                    }}
                    onRemove={handleRemove}
                  />
                </div>
              ) : (
                <div className={styles.skeletonPanel}>
                  <Skeleton.Node active style={{ width: '100%', height: '100%' }}>
                    <div style={{ width: 200, height: 100 }} />
                  </Skeleton.Node>
                </div>
              )}
            </Panel>
            <PanelResizeHandle
              className={`${styles.resizeHandle} ${isDragging ? styles.resizeHandleActive : ""}`}
              onDragging={setIsDragging}
            />
            <Panel defaultSize={50} minSize={40}>
              {isLoading ? (
                <div className={styles.skeletonPanel}>
                  <Skeleton active paragraph={{ rows: 10 }} />
                </div>
              ) : (
                <ConsoleLogPanel
                  sourceId={sourceId}
                  rrwebPlayerInstance={rrwebPlayerInstance}
                />
              )}
            </Panel>
          </PanelGroup>
        </Panel>
        {rrwebPlayerInstance && (
          <RRwebTimeLine
            rrwebPlayerInstance={rrwebPlayerInstance}
            sourceId={sourceId}
            // 色板贴在倍速按钮右侧；AI 分析仍在最右（extra）
            extraLeft={
              <AnnotationToolbar
                // 有选中批注时,色板颜色 = 选中批注的颜色; 否则 = 新建默认色
                currentColor={
                  (activeId &&
                    annotations.find((a) => a.id === activeId)?.color) ||
                  currentColor
                }
                onColorClick={(c) => {
                  // 有选中: 改选中批注的颜色 (pin + 高亮块都会同步, 因为它们都从 annotation.color 渲染)
                  // 无选中: 改新建默认色
                  if (activeId) {
                    update(activeId, { color: c });
                  } else {
                    setCurrentColor(c);
                  }
                }}
              />
            }
            extra={
              events && (
                <AiAnalysis
                  events={events}
                  rrwebPlayerInstance={rrwebPlayerInstance}
                />
              )
            }
          />
        )}
      </PanelGroup>

      <AnnotationSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        annotations={annotations}
        activeId={activeId}
        onCardActivate={(a) => handleAnnotationActivate(a.id, a.timestamp)}
        onUpdate={update}
        onRemove={handleRemove}
      />

      {!sidebarOpen && (
        <button
          type="button"
          className={styles.sidebarToggle}
          onClick={() => setSidebarOpen(true)}
          title="展开批注侧边栏"
        >
          <MessageOutlined />
          {annotations.length > 0 && (
            <span className={styles.sidebarToggleCount}>
              {annotations.length}
            </span>
          )}
        </button>
      )}

      {/* 可拖拽主题切换悬浮按钮，松手后吸附到最近角落 */}
      <DraggableFloatMenu />
    </div>
  );
};

export default function Page() {
  return (
    <ThemeProvider>
      <App>
        <Suspense fallback={<Skeleton />}>
          <ReplayPageClient />
        </Suspense>
      </App>
    </ThemeProvider>
  );
}
