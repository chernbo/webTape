import { defineConfig } from "vite";

// vite.config.ts 只在 Node 里跑, 不进 bundle.
// tsconfig 没装 @types/node, 这里就地声明 process 避免 IDE 标红.
declare const process: { env: Record<string, string | undefined> };

// 两种构建目标:
//   BUILD_TARGET=iife (默认) → dist/web-tape.iife.js   给 <script> / CDN 用, 自动挂 FAB
//   BUILD_TARGET=es           → dist/index.mjs         给 npm i 用 (库模式, 无副作用)
const target = process.env.BUILD_TARGET === "es" ? "es" : "iife";
const fileName = process.env.BUILD_FILENAME || "web-tape";

export default defineConfig(
  target === "es"
    ? {
        build: {
          // ESM 库构建从纯 API 入口出, 不带 uiEmbed 的启动副作用
          lib: {
            entry: "src/index.ts",
            formats: ["es"],
            fileName: () => "index.mjs",
          },
          // rrweb 等运行时依赖不打进包, 交给使用方 (peer/dep) 安装
          rollupOptions: {
            external: [
              "rrweb",
              "@rrweb/packer",
              "@rrweb/rrweb-plugin-console-record",
            ],
          },
          minify: false, // 库产物不压缩, 交给使用方的打包器
          sourcemap: true,
          emptyOutDir: true, // es 先构建, 清空 dist
        },
      }
    : {
        build: {
          lib: {
            entry: "src/ui/uiEmbed.ts",
            name: "RRWebToolbox",
            formats: ["iife"],
            fileName,
          },
          minify: true,
          sourcemap: false,
          emptyOutDir: false, // 在 es 构建之后跑, 保留 dist 里的 index.mjs / d.ts
        },
      },
);
