"use client";

import { FC, MouseEvent, useEffect, useState } from "react";
import { CloseOutlined } from "@ant-design/icons";
import type { Annotation } from "../../types/annotation";
import {
  ANNOTATION_COLOR_HEX,
  getAnnotationBorderColor,
  getAnnotationTextColor,
} from "../../types/annotation";
import styles from "./style.module.scss";

/** Pin 命中当前时间的半窗口大小 (ms)。回放经过这个窗口时 pin 短暂显现。 */
const VISIBLE_WINDOW_MS = 800;

interface Props {
  annotations: Annotation[];
  activeId: string | null;
  rrwebPlayerInstance: any | null;
  onPlace: (x: number, y: number, timestamp: number) => void;
  onPinClick: (id: string) => void;
  onRemove: (id: string) => void;
}

const AnnotationLayer: FC<Props> = ({
  annotations,
  activeId,
  rrwebPlayerInstance,
  onPlace,
  onPinClick,
  onRemove,
}) => {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  // rrweb-player 没有稳定的 time-change 事件，退而轮询 getCurrentTime()
  // 决定哪些 pin 在当前时刻可见（命中 timestamp ± VISIBLE_WINDOW_MS 窗口）
  useEffect(() => {
    if (!rrwebPlayerInstance) return;
    const getTime = () =>
      rrwebPlayerInstance.getReplayer?.()?.getCurrentTime?.() ?? 0;

    const poll = () => {
      const t = getTime();
      const next = new Set<string>();
      for (const a of annotations) {
        if (Math.abs(a.timestamp - t) <= VISIBLE_WINDOW_MS) next.add(a.id);
      }
      // Set 内容未变时返回 prev，避免 150ms 节奏下无谓的 re-render
      setVisibleIds((prev) => {
        if (prev.size === next.size) {
          let same = true;
          for (const id of prev) {
            if (!next.has(id)) {
              same = false;
              break;
            }
          }
          if (same) return prev;
        }
        return next;
      });
    };

    poll();
    const id = setInterval(poll, 150);
    return () => clearInterval(id);
    // activeId 进入 deps：点击卡片 → gotoAndPause 后立即重算，
    // 免得 150ms 轮询间隔让 pin 闪现滞后
  }, [rrwebPlayerInstance, annotations, activeId]);

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    const t = rrwebPlayerInstance?.getReplayer?.()?.getCurrentTime?.() ?? 0;
    onPlace(x, y, t);
  };

  return (
    <div className={styles.layer} onClick={handleOverlayClick}>
      {annotations.map((a) => {
        const isVisible = visibleIds.has(a.id);
        return (
          <div
            key={a.id}
            className={`${styles.pinWrap} ${isVisible ? styles.visible : ""}`}
            style={{
              left: `${a.x * 100}%`,
              top: `${a.y * 100}%`,
            }}
          >
            <button
              type="button"
              className={`${styles.pin} ${
                activeId === a.id ? styles.active : ""
              }`}
              style={{
                backgroundColor: ANNOTATION_COLOR_HEX[a.color],
                color: getAnnotationTextColor(a.color),
                borderColor: getAnnotationBorderColor(a.color),
              }}
              // stopPropagation 避免冒泡到 .layer 触发新 pin 落点
              onClick={(ev) => {
                ev.stopPropagation();
                onPinClick(a.id);
              }}
            >
              {a.index}
            </button>
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={(ev) => {
                ev.stopPropagation();
                onRemove(a.id);
              }}
              aria-label="delete"
            >
              <CloseOutlined />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default AnnotationLayer;
