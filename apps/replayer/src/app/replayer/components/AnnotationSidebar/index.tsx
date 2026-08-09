"use client";

import { FC, useEffect, useRef } from "react";
import { Drawer, Input, Empty } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { Annotation } from "../../types/annotation";
import {
  ANNOTATION_COLOR_HEX,
  getAnnotationBorderColor,
  getAnnotationTextColor,
} from "../../types/annotation";
import styles from "./style.module.scss";
import { useI18n } from "../../../i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  annotations: Annotation[];
  activeId: string | null;
  onCardActivate: (a: Annotation) => void;
  onUpdate: (id: string, patch: Partial<Pick<Annotation, "comment">>) => void;
  onRemove: (id: string) => void;
}

const formatTime = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
};

const AnnotationSidebar: FC<Props> = ({
  open,
  onClose,
  annotations,
  activeId,
  onCardActivate,
  onUpdate,
  onRemove,
}) => {
  const { t } = useI18n();
  const listRef = useRef<HTMLDivElement>(null);

  // 当 activeId 变动，滚动到对应卡片
  useEffect(() => {
    if (!activeId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLDivElement>(
      `[data-annotation-id="${activeId}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeId]);

  return (
    <Drawer
      title={t("annotation.sidebarTitle")}
      placement="right"
      onClose={onClose}
      open={open}
      // 去掉遮罩：Drawer 打开时用户仍可与播放器/时间轴交互
      mask={false}
      rootClassName={styles.drawerRoot}
      // AntD v6：`width` 已废弃，`size` 仅接受 'default' | 'large'，
      // 自定义宽度需通过 styles.wrapper
      styles={{ wrapper: { width: 340 } }}
    >
      <div ref={listRef} className={styles.list}>
        {annotations.length === 0 ? (
          <Empty description={t("annotation.emptyDesc")} />
        ) : (
          annotations.map((a) => (
            <div
              key={a.id}
              data-annotation-id={a.id}
              className={`${styles.card} ${activeId === a.id ? styles.active : ""}`}
              onClick={() => onCardActivate(a)}
            >
              <div className={styles.head}>
                <span
                  className={styles.badge}
                  style={{
                    backgroundColor: ANNOTATION_COLOR_HEX[a.color],
                    color: getAnnotationTextColor(a.color),
                    borderColor: getAnnotationBorderColor(a.color),
                  }}
                >
                  {a.index}
                </span>
                <span className={styles.timestamp}>
                  {formatTime(a.timestamp)}
                </span>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(a.id);
                  }}
                  aria-label={t("annotation.delete")}
                >
                  <DeleteOutlined />
                </button>
              </div>
              <Input.TextArea
                placeholder={t("annotation.commentPlaceholder")}
                // 使用 defaultValue（非受控）避免每次键入触发父组件 re-render；
                // 最终值在 onBlur 一次性同步回 annotations
                defaultValue={a.comment}
                autoSize={{ minRows: 2, maxRows: 8 }}
                // 点击 TextArea 不要冒泡触发外层 card onClick，
                // 避免与 onFocus 重复调用 onCardActivate
                onClick={(e) => e.stopPropagation()}
                onFocus={() => onCardActivate(a)}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== a.comment) onUpdate(a.id, { comment: v });
                }}
                variant="borderless"
                className={styles.commentInput}
              />
            </div>
          ))
        )}
      </div>
    </Drawer>
  );
};

export default AnnotationSidebar;
