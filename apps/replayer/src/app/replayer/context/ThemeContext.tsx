"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";

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

  // 同步 data-theme 到 <html>，这样 AntD Drawer / Modal 等走 body 的 portal
  // 也能继承到 [data-theme] 下的 CSS 变量
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      <ConfigProvider
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
