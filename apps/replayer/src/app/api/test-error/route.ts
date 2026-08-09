/**
 * GET /api/test-error?status=500
 *
 * 测试用接口: 返回指定 HTTP 状态码, 用于手测 web-tape 哨兵模式.
 * 仅 dev 环境暴露 (NODE_ENV !== "production" 时启用).
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "test endpoint disabled in production" },
      { status: 404 },
    );
  }
  const status = Number(req.nextUrl.searchParams.get("status") || 500);
  return NextResponse.json({ ok: false, status, fake: true }, { status });
}
