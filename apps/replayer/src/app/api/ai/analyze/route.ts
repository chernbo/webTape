/**
 * POST /api/ai/analyze
 *
 * AI 分析服务端代理.
 *   - 客户端 (AiAnalysis 组件) 把提取好的结构化数据 { inputs } POST 过来
 *   - 本路由在服务端带上 API Key 转发给 Workflow API (Dify/Tify 等)
 *   - 结果原样回给客户端
 *
 * 为什么要服务端代理:
 *   AiAnalysis 是客户端组件, 若直接在浏览器里带 Bearer <key> 调 Workflow,
 *   key 会被打进前端 bundle, 任何人都能在 devtools 看到. 通过本路由中转,
 *   AI_WORKFLOW_API_KEY 只存在于服务端 (不加 NEXT_PUBLIC_ 前缀), 不外泄.
 *
 * 环境变量 (见 .env.example):
 *   - AI_WORKFLOW_API_URL   Workflow 运行 endpoint
 *   - AI_WORKFLOW_API_KEY   Workflow API Key (服务端专用)
 * 未配置时返回 501, "AI 分析" 功能优雅降级, 不影响回放 / 网络 / 批注等其它能力.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// Workflow blocking 模式可能较慢, 给足时间
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const apiUrl = process.env.AI_WORKFLOW_API_URL;
  const apiKey = process.env.AI_WORKFLOW_API_KEY;

  // 未配置 → 优雅降级, 给出可读提示
  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "AI 分析未配置: 请在 .env 设置 AI_WORKFLOW_API_URL 和 AI_WORKFLOW_API_KEY",
      },
      { status: 501 },
    );
  }

  let inputs: Record<string, unknown> = {};
  try {
    const body = await request.json();
    inputs =
      body?.inputs && typeof body.inputs === "object" ? body.inputs : {};
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid JSON body" },
      { status: 400 },
    );
  }

  try {
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs,
        response_mode: "blocking",
        user: "webTape-replayer",
      }),
    });

    if (!resp.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Workflow API error: ${resp.status} ${resp.statusText}`,
        },
        { status: 502 },
      );
    }

    const data = await resp.json();
    // blocking 模式 workflow 响应: outputs.result (结束节点输出变量名)
    const result =
      data?.outputs?.result ??
      data?.outputs?.text ??
      data?.data?.outputs?.result ??
      "（无返回内容）";

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[POST /api/ai/analyze] failed:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
