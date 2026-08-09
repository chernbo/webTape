import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { LocaleProvider } from "./i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebTape | Record & replay user sessions · 升级用户反馈渠道",
  description:
    "一键录制用户操作轨迹，完整还原网络请求与控制台日志。 One-click session recording with full network & console replay.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang 由 LocaleProvider 在客户端按当前语言同步（zh-CN / en）
    <html lang="en">
      <body>
        {/* 让 antd 的 css-in-js 在 SSR 阶段就把样式收集到 <head>,
            避免首屏 hydrate 前的"无样式闪烁" (FOUC) */}
        <AntdRegistry>
          {/* 全局语言 provider：让所有页面（首页 / guide / experience / replayer）
              共享同一份语言状态与 t() */}
          <LocaleProvider>{children}</LocaleProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
