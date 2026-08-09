"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import { useI18n } from "../../i18n";

type ThemeMode = "dark" | "light";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  setMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>("light");
  // antd 内置组件（分页、Empty、DatePicker 等）文案随全局语言切换
  const { locale } = useI18n();

  // 同步 data-theme 到 <html>，这样 AntD Drawer / Modal 等走 body 的 portal
  // 也能继承到 [data-theme] 下的 CSS 变量
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      <ConfigProvider
        locale={locale === "zh" ? zhCN : enUS}
        theme={{
          algorithm:
            mode === "dark"
              ? antdTheme.darkAlgorithm
              : antdTheme.defaultAlgorithm,
        }}
      >
        <div data-theme={mode} style={{ height: "100%" }}>
          {children}
        </div>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};
