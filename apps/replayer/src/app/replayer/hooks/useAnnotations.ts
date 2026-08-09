import { message } from "antd";
import useSWR from "swr";
import { useCallback } from "react";
import type { Annotation } from "../types/annotation";

const fetcher = async (url: string): Promise<Annotation[]> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

// 删除后按显示序重排 1,2,3…，保证 badge 序号连续
const reindex = (list: Annotation[]): Annotation[] =>
  list.map((a, i) => ({ ...a, index: i + 1 }));

const useAnnotations = (sourceId: string) => {
  const url = sourceId
    ? `/api/annotations?sourceId=${encodeURIComponent(sourceId)}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<Annotation[]>(url, fetcher, {
    // 避免窗口聚焦时 revalidate 覆盖用户正在编辑中的乐观态
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    onError: (err) => message.error(err.message),
  });

  // 全量写盘（乐观更新：先本地 mutate，再后台 POST；失败回滚）
  const persist = useCallback(
    async (next: Annotation[], prev: Annotation[]) => {
      mutate(next, { revalidate: false });
      try {
        const res = await fetch("/api/annotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId, annotations: next }),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      } catch (e) {
        mutate(prev, { revalidate: false });
        message.error((e as Error).message);
        throw e;
      }
    },
    [sourceId, mutate],
  );

  const add = useCallback(
    (partial: Omit<Annotation, "id" | "index" | "createdAt">) => {
      const prev = data ?? [];
      const newItem: Annotation = {
        ...partial,
        // crypto.randomUUID 仅在 secure context 可用；非 HTTPS/localhost 场景退回到时间戳+随机串
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        index: prev.length + 1,
        createdAt: Date.now(),
      };
      const next = [...prev, newItem];
      persist(next, prev);
      return newItem;
    },
    [data, persist],
  );

  const update = useCallback(
    (id: string, patch: Partial<Annotation>) => {
      const prev = data ?? [];
      const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      persist(next, prev);
    },
    [data, persist],
  );

  const remove = useCallback(
    (id: string) => {
      const prev = data ?? [];
      const next = reindex(prev.filter((a) => a.id !== id));
      persist(next, prev);
    },
    [data, persist],
  );

  return {
    annotations: data ?? [],
    isLoading,
    error,
    add,
    update,
    remove,
    mutate,
  };
};

export default useAnnotations;
