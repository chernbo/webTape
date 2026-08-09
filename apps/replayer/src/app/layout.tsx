import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";

export const metadata: Metadata = {
  title: "web-Tape | 升级用户反馈渠道，加速产研定位问题",
  description: "一键录制用户操作轨迹，完整还原网络请求与控制台日志。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* 让 antd 的 css-in-js 在 SSR 阶段就把样式收集到 <head>,
            避免首屏 hydrate 前的"无样式闪烁" (FOUC) */}
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
