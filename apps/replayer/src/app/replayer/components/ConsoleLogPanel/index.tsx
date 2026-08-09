"use client";

import { FC, useEffect, useMemo, useRef, useState } from "react";
import useEvents from "../../hooks/useEvents";
import useLayoutInfo from "../../hooks/useLayoutInfo";
import dayjs from "dayjs";
import numbro from "numbro";
import { CONSOLE_TAG, safeParseJson, toShowJson } from "../utils";
import { Input } from "antd";
import styles from "./index.module.css";
import { useI18n } from "../../../i18n";

type LogLevel = "all" | "log" | "warn" | "error" | "info" | "debug";

// 顶部 tab 筛选项，对应 rrweb console plugin 的 level 字段；label 走 i18n key
const LEVEL_TABS: { key: LogLevel; labelKey: string }[] = [
  { key: "all", labelKey: "console.tabAll" },
  { key: "log", labelKey: "console.tabLog" },
  { key: "warn", labelKey: "console.tabWarn" },
  { key: "error", labelKey: "console.tabError" },
  { key: "info", labelKey: "console.tabInfo" },
  { key: "debug", labelKey: "console.tabDebug" },
];

interface ConsoleLogPanelProps {
  sourceId: string;
  rrwebPlayerInstance: any;
}

const ConsoleLogPanel: FC<ConsoleLogPanelProps> = ({
  sourceId,
  rrwebPlayerInstance,
}) => {
  const { t } = useI18n();
  const [consoleLogs, setConsoleLogs] = useState<any[]>([]);
  const [activeLevel, setActiveLevel] = useState<LogLevel>("all");
  const [filterText, setFilterText] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Set<number>>(new Set());
  // 记录上一次已播放的日志数量，避免高频 ui-update-progress 事件触发无意义 re-render
  const prevCountRef = useRef(-1);

  const { observeRef, observeRect } = useLayoutInfo();
  const { data: events } = useEvents(sourceId);

  // 从原始 events 中过滤出 console 类型事件，并将 payload 参数预先 JSON.parse
  const allConsoleEvents = useMemo(() => {
    return (
      events
        ?.filter((item: any) => item?.data?.plugin === CONSOLE_TAG)
        ?.map((item: any) => ({
          ...item,
          data: {
            ...item.data,
            args: item?.data?.payload?.payload?.map(safeParseJson),
          },
        })) || []
    );
  }, [events]);

  // 监听播放进度，根据当前播放时间截取已发生的日志
  // 只在日志数量变化时才 setState，避免每帧都触发 re-render 导致 UI 卡顿
  useEffect(() => {
    const beginTime = events?.[0]?.timestamp ?? 0;
    const totalTime = rrwebPlayerInstance.getMetaData().totalTime;

    const handleProgress = (event: { payload: number }) => {
      // event.payload 是 0~1 的播放进度，乘以 totalTime 得到当前毫秒数
      const currentLogs = allConsoleEvents.filter(
        (item: any) =>
          dayjs(item.timestamp).diff(beginTime, "millisecond", true) <=
          numbro(event.payload).multiply(totalTime).value(),
      );
      // 仅数量变化时更新，防止高频 setConsoleLogs
      if (currentLogs.length !== prevCountRef.current) {
        prevCountRef.current = currentLogs.length;
        setConsoleLogs(currentLogs);
      }
    };

    rrwebPlayerInstance.addEventListener("ui-update-progress", handleProgress);
  }, [rrwebPlayerInstance, events, allConsoleEvents]);

  // 根据 level tab 和文本输入双重过滤
  const filteredLogs = useMemo(() => {
    return consoleLogs.filter((row) => {
      const level = row.data.payload.level as string;
      const matchLevel = activeLevel === "all" || level === activeLevel;
      const firstArg = String(row.data.payload.payload?.[0] ?? "");
      const matchText =
        !filterText ||
        firstArg.toLowerCase().includes(filterText.toLowerCase());
      return matchLevel && matchText;
    });
  }, [consoleLogs, activeLevel, filterText]);

  // 统计各 level 数量，用于 tab badge 展示
  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    consoleLogs.forEach((row) => {
      const level = row.data.payload.level as string;
      counts[level] = (counts[level] || 0) + 1;
    });
    return counts;
  }, [consoleLogs]);

  // 切换单条日志的展开/收起状态
  const toggleExpand = (index: number) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  return (
    <div ref={observeRef} className={styles.panel}>
      {/* toolbar */}
      <div className={styles.toolbar}>
        <Input
          className={styles.filterInput}
          placeholder={t("console.filterPlaceholder")}
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          allowClear
        />
        <div className={styles.levelTabs}>
          {LEVEL_TABS.map(({ key, labelKey }) => {
            const count = key === "all" ? consoleLogs.length : (levelCounts[key] ?? 0);
            return (
              <button
                key={key}
                className={`${styles.levelBtn} ${activeLevel === key ? styles.levelBtnActive : ""} ${key === "error" && count > 0 ? styles.levelBtnError : ""} ${key === "warn" && count > 0 ? styles.levelBtnWarn : ""}`}
                onClick={() => setActiveLevel(key)}
              >
                {t(labelKey)}
                {count > 0 && <span className={styles.badge}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* log list */}
      <div className={styles.logList} style={{ height: observeRect.height - 72 }}>
        {filteredLogs.length === 0 ? (
          <div className={styles.empty}>{t("console.empty")}</div>
        ) : (
          filteredLogs.map((row, i) => {
            const level: string = row.data.payload.level;
            const firstArg = String(row.data.payload.payload?.[0] ?? "");
            const extraArgs: any[] = row.data.args?.slice(1) ?? [];
            const trace: string[] = row.data.payload.trace ?? [];
            const hasDetail = extraArgs.length > 0 || trace.length > 0;
            const expanded = expandedKeys.has(i);

            return (
              <div
                key={i}
                className={`${styles.logRow} ${styles[`level_${level}`] ?? ""}`}
                onClick={() => hasDetail && toggleExpand(i)}
              >
                <div className={styles.logHeader}>
                  {hasDetail && (
                    <span className={styles.arrow}>{expanded ? "▼" : "▶"}</span>
                  )}
                  {!hasDetail && <span className={styles.arrowPlaceholder} />}
                  <span className={`${styles.levelTag} ${styles[`tag_${level}`]}`}>
                    {level}
                  </span>
                  <span className={styles.logMessage}>{firstArg}</span>
                </div>

                {expanded && (
                  <div className={styles.logDetail}>
                    {extraArgs.map((v, idx) => (
                      <pre key={idx} className={styles.logPre}>
                        {toShowJson(v)}
                      </pre>
                    ))}
                    {trace.length > 0 && (
                      <pre className={`${styles.logPre} ${styles.trace}`}>
                        {trace.join("\n")}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConsoleLogPanel;
