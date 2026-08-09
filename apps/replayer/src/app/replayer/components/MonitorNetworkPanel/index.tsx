"use client";

import { FC, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "antd";
import { useI18n } from "../../../i18n";
import useLayoutInfo from "../../hooks/useLayoutInfo";
import useEvents from "../../hooks/useEvents";
import dayjs from "dayjs";
import numbro from "numbro";
import { safeParseJson } from "../utils";
import JsonTreeView from "../JsonTreeView";
import CurlButton from "../CurlButton";
import styles from "./index.module.css";

interface MonitorNetworkProps {
  sourceId: string;
  rrwebPlayerInstance: any;
}

// 状态码对应的颜色标识
const getStatusColor = (status: number) => {
  if (status >= 500) return "#f48771";
  if (status >= 400) return "#f48771";
  if (status >= 300) return "#cca700";
  if (status >= 200) return "#89d185";
  return "#9d9d9d";
};

const MonitorNetwork: FC<MonitorNetworkProps> = ({
  sourceId,
  rrwebPlayerInstance,
}) => {
  const { t } = useI18n();
  const [networkEvents, setNetworkEvents] = useState<any[]>([]);
  const [filterText, setFilterText] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  // 当前播放进度（毫秒），用于时序线动态追踪
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  // 避免高频 re-render
  const prevCountRef = useRef(-1);

  const { observeRef, observeRect } = useLayoutInfo();
  const { data: events } = useEvents(sourceId);

  // 从原始 events 中过滤出 tag 为 network 的事件,
  // 给每条挂一个稳定的展示 ID (_rowId), 用作 React key.
  // 不用 timestamp + url + startTime 组合: 同毫秒同 URL 的请求(缓存命中或并发)会撞 key
  const allNetworkEvents = useMemo(() => {
    const list = events?.filter((item: any) => item?.data?.tag === "network") || [];
    return list.map((item: any, idx: number) => ({ ...item, _rowId: idx }));
  }, [events]);

  // 录制起始时间
  const beginTime = useMemo(() => {
    return events?.[0]?.timestamp ?? 0;
  }, [events]);

  // 录制总时长（毫秒）
  const totalTime = useMemo(() => {
    if (!rrwebPlayerInstance) return 0;
    return rrwebPlayerInstance.getMetaData().totalTime;
  }, [rrwebPlayerInstance]);

  // 监听播放进度，截取已发生的网络请求 + 更新当前播放时间
  useEffect(() => {
    if (!totalTime) return;

    const handleProgress = (event: { payload: number }) => {
      const playedMs = numbro(event.payload).multiply(totalTime).value();
      setCurrentTimeMs(playedMs);

      const currentList = allNetworkEvents.filter(
        (item: any) =>
          // 用 startTime 判断请求是否已发生，而非 event.timestamp（endTime）
          // 否则跳转到 startTime 时，endTime 还未到，该请求会被过滤掉
          dayjs(Number(item.data.payload.startTime || item.timestamp)).diff(
            beginTime,
            "millisecond",
            true,
          ) <= playedMs,
      );
      // 仅数量变化时更新，防止高频 setState
      if (currentList.length !== prevCountRef.current) {
        prevCountRef.current = currentList.length;
        setNetworkEvents(currentList);
      }
    };

    rrwebPlayerInstance.addEventListener("ui-update-progress", handleProgress);
  }, [rrwebPlayerInstance, allNetworkEvents, beginTime, totalTime]);

  // 文本过滤
  const filteredEvents = useMemo(() => {
    if (!filterText) return networkEvents;
    const keyword = filterText.toLowerCase();
    return networkEvents.filter((item: any) => {
      const url = (item.data.payload.url || "").toLowerCase();
      const method = (item.data.payload.method || "").toLowerCase();
      const status = String(item.data.payload.status || "");
      return (
        url.includes(keyword) ||
        method.includes(keyword) ||
        status.includes(keyword)
      );
    });
  }, [networkEvents, filterText]);

  // 统计错误请求数量
  const errorCount = useMemo(() => {
    return networkEvents.filter((item: any) => item.data.payload.status >= 400)
      .length;
  }, [networkEvents]);

  // 用 allNetworkEvents 里挂的稳定 _rowId 作 key, 即便过滤后顺序不变也不漂移
  const getRowKey = (item: any) => String(item._rowId);

  // 点击行：仅切换展开/收起，不影响进度条
  const handleRowClick = (item: any) => {
    const key = getRowKey(item);
    setExpandedKey(expandedKey === key ? null : key);
  };

  // 安全解析 responseBody，用于展开详情展示
  const parseResponseBody = (raw: any) => {
    if (!raw) return null;
    if (typeof raw === "string") return safeParseJson(raw);
    return raw;
  };

  // 解析 URL 上的 query string -> 对象，重复 key 合并为数组
  // 例: ?a=1&b=2&b=3 -> { a: "1", b: ["2","3"] }
  // 解析失败或没有 query 时返回 null
  const parseQueryParams = (rawUrl: string): Record<string, string | string[]> | null => {
    if (!rawUrl) return null;
    try {
      // URL 构造器需要绝对地址；相对路径用 dummy origin 兜底
      const u = rawUrl.startsWith("http")
        ? new URL(rawUrl)
        : new URL(rawUrl, "http://_");
      if (![...u.searchParams.keys()].length) return null;
      const result: Record<string, string | string[]> = {};
      for (const key of u.searchParams.keys()) {
        const all = u.searchParams.getAll(key);
        result[key] = all.length > 1 ? all : all[0];
      }
      return result;
    } catch {
      return null;
    }
  };

  // 计算单条请求在时序图中的位置和宽度（百分比）
  // 用 startTime 作为起点，endTime - startTime 作为耗时
  const getTimelineBar = (item: any) => {
    if (!totalTime) return { left: 0, width: 0 };
    const { startTime, endTime } = item.data.payload;
    const startMs = dayjs(Number(startTime || item.timestamp)).diff(
      beginTime,
      "millisecond",
      true,
    );
    const duration =
      startTime && endTime ? Number(endTime) - Number(startTime) : 50;
    const left = (startMs / totalTime) * 100;
    const width = Math.max((duration / totalTime) * 100, 0.3);
    return { left, width };
  };

  // 当前播放进度线位置（百分比）
  const progressPercent = totalTime ? (currentTimeMs / totalTime) * 100 : 0;

  return (
    <div ref={observeRef} className={styles.panel}>
      {/* 顶部工具栏 */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <div className={styles.statsRow}>
            <span className={styles.statItem}>
              {t("network.showing", {
                shown: filteredEvents.length,
                total: allNetworkEvents.length,
              })}
            </span>
            {errorCount > 0 && (
              <span className={`${styles.statItem} ${styles.statError}`}>
                {t("network.issues", { count: errorCount })}
              </span>
            )}
          </div>
          <Input
            className={styles.filterInput}
            placeholder={t("network.filterPlaceholder")}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            allowClear
          />
        </div>
      </div>

      {/* 表头 */}
      <div className={styles.tableHeader}>
        <span className={styles.colArrow} />
        <span className={styles.colIndex}>#</span>
        <span className={styles.colStatus}>{t("network.colStatus")}</span>
        <span className={styles.colMethod}>{t("network.colMethod")}</span>
        <span className={styles.colUrl}>{t("network.colUrl")}</span>
        <span className={styles.colCurl}>{t("network.colCurl")}</span>
        <span className={styles.colTimeline}>
          {t("network.colTimeline")}
          <span className={styles.timelineScale}>
            {totalTime > 0 && (
              <>
                <span style={{ left: "0%" }}>0s</span>
                <span style={{ left: "25%" }}>
                  {(totalTime / 4000).toFixed(1)}s
                </span>
                <span style={{ left: "50%" }}>
                  {(totalTime / 2000).toFixed(1)}s
                </span>
                <span style={{ left: "75%" }}>
                  {((totalTime * 3) / 4000).toFixed(1)}s
                </span>
                <span style={{ left: "100%", transform: "translateX(-100%)" }}>
                  {(totalTime / 1000).toFixed(1)}s
                </span>
              </>
            )}
          </span>
        </span>
      </div>

      {/* 请求列表 */}
      <div
        className={styles.listBody}
        style={{ height: observeRect.height - 100 }}
      >
        {filteredEvents.length === 0 ? (
          <div className={styles.empty}>{t("network.empty")}</div>
        ) : (
          filteredEvents.map((item: any, i: number) => {
            const payload = item.data.payload;
            const { status, method, url } = payload;
            const isError = status >= 400;
            const bar = getTimelineBar(item);
            const rowKey = getRowKey(item);
            const expanded = expandedKey === rowKey;

            return (
              <div
                key={rowKey}
                className={`${styles.row} ${isError ? styles.rowError : ""}`}
                onClick={() => handleRowClick(item)}
              >
                <div className={styles.rowMain}>
                  {/* 展开/收起箭头放在最前面 */}
                  <span className={styles.colArrow}>
                    {expanded ? "▼" : "▶"}
                  </span>
                  <span className={styles.colIndex}>{i + 1}</span>
                  <span className={styles.colStatus}>
                    <span
                      className={styles.statusDot}
                      style={{ background: getStatusColor(status) }}
                    />
                    {status}
                  </span>
                  <span className={styles.colMethod}>{method}</span>
                  <span className={styles.colUrl} title={url}>
                    {url}
                  </span>
                  {/* cURL 复制按钮 */}
                  <span className={styles.colCurl}>
                    <CurlButton payload={payload} />
                  </span>
                  {/* 时序瀑布图列 */}
                  <span className={styles.colTimeline}>
                    <span className={styles.timelineTrack}>
                      <span
                        className={styles.progressLine}
                        style={{ left: `${progressPercent}%` }}
                      />
                      <span
                        className={styles.timelineBar}
                        style={{
                          left: `${bar.left}%`,
                          width: `${bar.width}%`,
                          background: isError
                            ? "rgba(244,135,113,0.7)"
                            : "rgba(137,209,133,0.6)",
                        }}
                      />
                    </span>
                  </span>
                </div>

                {/* 点击展开：展示该行完整网络详情，JSON 支持折叠 */}
                {expanded && (
                  <div
                    className={styles.expandedDetail}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={styles.detailSection}>
                      <span className={styles.detailLabel}>URL</span>
                      <span className={styles.detailValue}>{url}</span>
                    </div>
                    {(() => {
                      const qp = parseQueryParams(url);
                      if (!qp) return null;
                      return (
                        <div className={styles.detailSection}>
                          <span className={styles.detailLabel}>Query Params</span>
                          <div className={styles.detailTree}>
                            <JsonTreeView value={qp} rootName="queryParams" />
                          </div>
                        </div>
                      );
                    })()}
                    {payload.requestHeaders && (
                      <div className={styles.detailSection}>
                        <span className={styles.detailLabel}>Req Headers</span>
                        <div className={styles.detailTree}>
                          <JsonTreeView
                            value={safeParseJson(payload.requestHeaders)}
                            rootName="requestHeaders"
                          />
                        </div>
                      </div>
                    )}
                    {payload.requestBody && (
                      <div className={styles.detailSection}>
                        <span className={styles.detailLabel}>Req Body</span>
                        <div className={styles.detailTree}>
                          <JsonTreeView
                            value={safeParseJson(payload.requestBody)}
                            rootName="requestBody"
                          />
                        </div>
                      </div>
                    )}
                    {payload.responseHeaders && (
                      <div className={styles.detailSection}>
                        <span className={styles.detailLabel}>Res Headers</span>
                        <div className={styles.detailTree}>
                          <JsonTreeView
                            value={safeParseJson(payload.responseHeaders)}
                            rootName="responseHeaders"
                          />
                        </div>
                      </div>
                    )}
                    {payload.responseBody && (
                      <div className={styles.detailSection}>
                        <span className={styles.detailLabel}>Res Body</span>
                        <div className={styles.detailTree}>
                          <JsonTreeView
                            value={parseResponseBody(payload.responseBody)}
                            rootName="responseBody"
                          />
                        </div>
                      </div>
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

export default MonitorNetwork;
