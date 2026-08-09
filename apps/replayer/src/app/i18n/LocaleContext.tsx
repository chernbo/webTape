"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import zh from "./messages/zh";
import en from "./messages/en";

export type Locale = "zh" | "en";

const DICTS = { zh, en } as const;
const STORAGE_KEY = "webtape:locale";
const DEFAULT_LOCALE: Locale = "en";

/** 从嵌套字典里按点路径取值，如 t("floatMenu.theme") */
function resolve(dict: Record<string, unknown>, path: string): string | undefined {
  const val = path
    .split(".")
    .reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), dict);
  return typeof val === "string" ? val : undefined;
}

/** 简单插值：把 "{name}" 替换成 vars.name */
function interpolate(tpl: string, vars?: Record<string, string | number>): string {
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  /** 翻译：t("ns.key", { var }) —— 缺失时回退到 key 本身，便于发现漏翻 */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  toggleLocale: () => {},
  t: (key) => key,
});

export const useI18n = () => useContext(LocaleContext);

export const LocaleProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // 挂载后从 localStorage 恢复（避免 SSR/CSR 首屏 lang 不一致，统一在客户端纠正）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "zh" || saved === "en") setLocaleState(saved);
    } catch {
      /* localStorage 不可用时忽略 */
    }
  }, []);

  // 同步 <html lang> 与持久化
  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);
  const toggleLocale = useCallback(
    () => setLocaleState((prev) => (prev === "zh" ? "en" : "zh")),
    [],
  );

  const t = useCallback<LocaleContextValue["t"]>(
    (key, vars) => {
      const hit = resolve(DICTS[locale], key) ?? resolve(DICTS[DEFAULT_LOCALE], key);
      return hit != null ? interpolate(hit, vars) : key;
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};
