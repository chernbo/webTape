"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import useEvents from "../../hooks/useEvents";
import styles from "./index.module.css";

dayjs.extend(utc);

// 快进/回退步长（毫秒）
const SEEK_STEP_MS = 4000;

const RRwebTimeLine = ({
  rrwebPlayerInstance,
  sourceId,
  extra,
  extraLeft,
}: {
  rrwebPlayerInstance: any;
  sourceId: string;
  extra?: React.ReactNode;
  // 左侧扩展槽：渲染在倍速按钮后、hint(margin-left:auto) 前
  extraLeft?: React.ReactNode;
}) => {
  const [percent, setPercent] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);

  // hover 时显示的时间提示，用 ref 避免触发 re-render
  const [hoverTime, setHoverTime] = useState<string | null>(null);
  const [hoverLeft, setHoverLeft] = useState(0);

  // 用 ref 持有最新 percent，供 mousemove 读取，避免闭包陈旧值
  const percentRef = useRef(percent);
  const isPlayingRef = useRef(isPlaying);

  // 拖拽状态
  const draggingRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const pendingMsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const trackRef = useRef<HTMLDivElement>(null);
  const { data: events } = useEvents(sourceId);

  const totalTime = useMemo(
    () => rrwebPlayerInstance.getMetaData().totalTime,
    [rrwebPlayerInstance],
  );

  // 计算 network / console 事件在进度条上的标记点（百分比位置）
  const markers = useMemo(() => {
    if (!events?.length || !totalTime) return [];
    const beginTime = events[0].timestamp;
    return events
      .filter(
        (item: any) =>
          item?.data?.tag === "network" ||
          item?.data?.plugin === "rrweb/console@1",
      )
      .map((item: any) => ({
        ratio: dayjs(item.timestamp).diff(beginTime, "millisecond", true) / totalTime,
        isNetwork: item?.data?.tag === "network",
      }));
  }, [events, totalTime]);

  // 监听播放进度和播放状态
  useEffect(() => {
    const onProgress = (event: { payload: number }) => {
      const next = event.payload;
      // 节流：变化超过 0.1% 才更新，避免高频 re-render
      setPercent((prev) => {
        const updated = Math.abs(next - prev) > 0.001 ? next : prev;
        percentRef.current = updated;
        return updated;
      });
    };

    const onState = (event: { payload: "playing" | "paused" | "live" | "finish" }) => {
      const playing = event.payload === "playing";
      setIsPlaying(playing);
      isPlayingRef.current = playing;
    };

    rrwebPlayerInstance.addEventListener("ui-update-progress", onProgress);
    rrwebPlayerInstance.addEventListener("ui-update-player-state", onState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 键盘快捷键：Shift+Space 播放/暂停（避开批注输入空格冲突），← 回退 4s，→ 快进 4s
  //
  // rrweb-player 把回放画面渲染在 iframe 里, 鼠标点过 iframe 后 (打批注时一定会发生)
  // 焦点进入 iframe, keydown 只在 iframe 内部触发, 外层 document 收不到.
  //
  // 解决: 给 iframe 的 contentWindow 也挂一份. 但有时序问题 — rrweb 用 document.open()
  // 写入回放内容, 这一步会把 contentWindow 上预先挂的 keydown listener 清掉.
  // 所以挂的时机必须在 rrweb 完成首次 FullSnapshot 渲染之后, 即 'fullsnapshot-rebuilded'
  // 事件触发后. 此时 iframe 已经稳定, 后续无 document.open 再清听众.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.shiftKey) {
        e.preventDefault();
        rrwebPlayerInstance.toggle();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        const newMs = Math.max(0, percentRef.current * totalTime - SEEK_STEP_MS);
        rrwebPlayerInstance.goto(newMs, isPlayingRef.current);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        const newMs = Math.min(totalTime, percentRef.current * totalTime + SEEK_STEP_MS);
        rrwebPlayerInstance.goto(newMs, isPlayingRef.current);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // iframe contentWindow 上的 listener 会在 rrweb 调 document.open() 写入回放内容时
    // 被清掉, 所以这里每次 'fullsnapshot-rebuilded' 触发后都要强制重挂 (无论是不是同一个 win).
    // attachedWin 仅用于 cleanup 时知道要解绑哪个 window.
    const replayer = rrwebPlayerInstance?.getReplayer?.();
    let attachedWin: Window | null = null;
    const attachIframe = () => {
      const win: Window | null = replayer?.iframe?.contentWindow ?? null;
      if (!win) return;
      // 即便 win 引用没变, 之前挂上的 listener 也可能已被 document.open() 清掉, 强制再挂一次
      win.removeEventListener("keydown", handleKeyDown); // 同 ref + 同事件名, 重复 add 不会叠加, 但显式 remove 更稳
      win.addEventListener("keydown", handleKeyDown);
      attachedWin = win;
    };

    replayer?.on?.("fullsnapshot-rebuilded", attachIframe);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      attachedWin?.removeEventListener("keydown", handleKeyDown);
      replayer?.off?.("fullsnapshot-rebuilded", attachIframe);
    };
  }, [rrwebPlayerInstance, totalTime]);

  // 由 clientX 计算 0-1 比例
  const ratioFromClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  // rAF 合帧：高频 pointermove 期间，每帧最多一次 goto，避免卡顿
  const flushSeek = () => {
    rafRef.current = null;
    const ms = pendingMsRef.current;
    if (ms == null) return;
    pendingMsRef.current = null;
    const ratio = ms / totalTime;
    setPercent(ratio);
    percentRef.current = ratio;
    // false = replayer.pause(ms)：同步把 DOM 快进/回退到该时刻并保持暂停
    rrwebPlayerInstance.goto(ms, false);
  };

  const scheduleSeek = (ms: number) => {
    pendingMsRef.current = ms;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(flushSeek);
    }
  };

  // 拖拽开始
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const ratio = ratioFromClientX(e.clientX);
    if (ratio == null) return;
    draggingRef.current = true;
    wasPlayingRef.current = isPlayingRef.current;
    // 拖拽期间停掉 rrweb 内部的播放时钟，避免与 scrub 互相打架
    if (isPlayingRef.current) rrwebPlayerInstance.pause();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // 某些浏览器/touch 场景下可能抛错，忽略
    }
    scheduleSeek(ratio * totalTime);
  };

  // 拖拽中（hover tooltip 也始终更新）
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ratio = ratioFromClientX(e.clientX);
    if (ratio == null) return;
    const rect = trackRef.current!.getBoundingClientRect();
    setHoverTime(dayjs(ratio * totalTime).utc().format("mm:ss"));
    setHoverLeft(e.clientX - rect.left);
    if (draggingRef.current) {
      scheduleSeek(ratio * totalTime);
    }
  };

  // 拖拽结束 / 单击释放
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    // 等待最后一次 scheduled seek flush 完，再决定是否恢复播放
    const resume = wasPlayingRef.current;
    requestAnimationFrame(() => {
      if (rafRef.current != null) {
        // 还有未 flush 的 seek，等下一帧
        requestAnimationFrame(() => {
          if (resume) rrwebPlayerInstance.play(percentRef.current * totalTime);
        });
      } else if (resume) {
        rrwebPlayerInstance.play(percentRef.current * totalTime);
      }
    });
  };

  const handlePointerLeave = () => setHoverTime(null);

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    handlePointerUp(e);
    setHoverTime(null);
  };

  // 卸载时清理 pending rAF
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleSpeedChange = (value: number) => {
    setSpeed(value);
    rrwebPlayerInstance.setSpeed(value);
  };

  const currentTimeLabel = dayjs(percent * totalTime).utc().format("mm:ss");
  const totalTimeLabel = dayjs(totalTime).utc().format("mm:ss");

  return (
    <div className={styles.container}>
      {/* 进度条区域 */}
      <div className={styles.trackWrapper}>
        <div
          ref={trackRef}
          className={styles.track}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerLeave}
        >
          {/* 已播放填充 */}
          <div className={styles.trackFill} style={{ width: `${percent * 100}%` }} />

          {/* 事件标记点 */}
          {markers.map((m, i) => (
            <span
              key={i}
              className={`${styles.marker} ${m.isNetwork ? styles.markerNetwork : styles.markerConsole}`}
              style={{ left: `${m.ratio * 100}%` }}
            />
          ))}

          {/* 播放头 */}
          <div className={styles.playhead} style={{ left: `${percent * 100}%` }} />

          {/* hover 时间提示，仅在 hover 时渲染，不影响播放进度更新 */}
          {hoverTime && (
            <div
              className={styles.hoverTooltip}
              style={{ left: Math.max(20, Math.min(hoverLeft, (trackRef.current?.offsetWidth ?? 0) - 20)) }}
            >
              {hoverTime}
            </div>
          )}
        </div>

        {/* 时间标签 */}
        <div className={styles.timeLabels}>
          <span>00:00</span>
          <span>{currentTimeLabel}</span>
          <span>{totalTimeLabel}</span>
        </div>
      </div>

      {/* 控制栏 */}
      <div className={styles.controls}>
        {/* 播放/暂停按钮 */}
        <button
          className={`${styles.playBtn} ${styles.tooltip}`}
          onClick={() => rrwebPlayerInstance.toggle()}
          data-tooltip="Shift+Space"
        >
          {isPlaying ? (
            // pause icon
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            // play icon
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2.5l10 5.5-10 5.5V2.5z" />
            </svg>
          )}
        </button>

        {/* 时间显示 */}
        <span className={styles.timeDisplay}>
          {currentTimeLabel} / {totalTimeLabel}
        </span>

        {/* 倍速选择 */}
        <div className={styles.speedGroup}>
          {[1, 2, 4, 8].map((s) => (
            <button
              key={s}
              className={`${styles.speedBtn} ${speed === s ? styles.speedBtnActive : ""} ${styles.tooltip}`}
              onClick={() => handleSpeedChange(s)}
              data-tooltip={`${s}× speed`}
            >
              {s}×
            </button>
          ))}
        </div>

        {extraLeft && <span className={styles.extraSlot}>{extraLeft}</span>}

        {/* 快捷键提示 */}
        <span className={styles.hint}>
          <span className={styles.tooltip} data-tooltip="Rewind 4s">←</span>
          {" / "}
          <span className={styles.tooltip} data-tooltip="Forward 4s">→</span>
          {" 4s · "}
          <span className={styles.tooltip} data-tooltip="Play / Pause">Shift+Space</span>
        </span>
        {extra && <span className={styles.extraSlot}>{extra}</span>}
      </div>
    </div>
  );
};

export default RRwebTimeLine;
