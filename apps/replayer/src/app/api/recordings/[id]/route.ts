/**
 * GET /api/recordings/:id
 *
 * 录屏读取接口 (MySQL only)
 *   - fed_bugtape.recordings 命中 → 返回 events
 *   - 没记录 → 404
 *
 * 响应:
 *   { ok: true, meta: { id, title, duration, size, createdAt }, events: [...] }
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { ok: false, error: "id is required" },
      { status: 400 },
    );
  }

  try {
    const row = await db.recording.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        duration: true,
        size: true,
        events: true,
        createdAt: true,
      },
    });

    if (!row || !row.events) {
      return NextResponse.json(
        { ok: false, error: "Recording not found" },
        { status: 404 },
      );
    }

    let events: unknown;
    try {
      events = JSON.parse(row.events);
    } catch {
      return NextResponse.json(
        { ok: false, error: "events JSON corrupted in MySQL" },
        { status: 500 },
      );
    }

    const { events: _omit, ...meta } = row;
    void _omit;
    return NextResponse.json({
      ok: true,
      meta,
      events,
    });
  } catch (err) {
    console.error(`[GET /api/recordings/${id}] failed:`, err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

// 注: 曾有一个无鉴权的 DELETE /api/recordings/:id 接口, 因未接入 UI 且对公网敞开
// (任何人凭 sourceId 即可删除录屏), 存在安全风险, 已移除。
// 未来若做"录屏管理"功能, 请连同鉴权 (token/session 或网关访问控制) 一起加回。
