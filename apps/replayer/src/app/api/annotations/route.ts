/**
 * 批注 API (远程 MySQL fed_bugtape.annotations)
 *
 * 写入语义: 全量覆盖
 *   每次 POST 传完整 annotations[], 后端事务里先 deleteMany 再 createMany
 *
 * 外键约束: 写批注前必须先有对应 recording, 否则 404
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface AnnotationPayload {
  id: string;
  index: number;
  timestamp: number;
  x: number;
  y: number;
  comment?: string;
  color: string;
}

/**
 * GET /api/annotations?sourceId=xxx
 * 返回该录屏的批注数组 (无批注返回 [])
 */
export async function GET(request: NextRequest) {
  const sourceId = request.nextUrl.searchParams.get("sourceId") || "";
  if (!sourceId) {
    return NextResponse.json(
      { error: "sourceId is required" },
      { status: 400 },
    );
  }

  try {
    const rows = await db.annotation.findMany({
      where: { recordingId: sourceId },
      orderBy: { index: "asc" },
    });

    // 转成前端 Annotation 形状 (字段名对齐 types/annotation.ts)
    const data = rows.map((r) => ({
      id: r.id,
      index: r.index,
      timestamp: r.timestamp,
      x: r.x,
      y: r.y,
      comment: r.comment ?? "",
      color: r.color,
      createdAt: r.createdAt.getTime(),
    }));

    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/annotations] error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/annotations
 * body: { sourceId: string; annotations: Annotation[] }
 * 全量覆盖该 sourceId 下的所有批注
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const sourceId = typeof body?.sourceId === "string" ? body.sourceId : "";
  const annotations: AnnotationPayload[] | null = Array.isArray(
    body?.annotations,
  )
    ? body.annotations
    : null;

  if (!sourceId) {
    return NextResponse.json(
      { error: "sourceId is required" },
      { status: 400 },
    );
  }
  if (!annotations) {
    return NextResponse.json(
      { error: "annotations must be an array" },
      { status: 400 },
    );
  }

  try {
    // 校验 recording 存在 (外键约束前置, 给出可读错误)
    const recording = await db.recording.findUnique({
      where: { id: sourceId },
      select: { id: true },
    });
    if (!recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 },
      );
    }

    await db.$transaction(async (tx) => {
      // 1. 删旧批注
      await tx.annotation.deleteMany({
        where: { recordingId: sourceId },
      });

      // 2. 批量插入新批注
      if (annotations.length > 0) {
        await tx.annotation.createMany({
          data: annotations.map((a) => ({
            id: a.id,
            recordingId: sourceId,
            index: a.index,
            timestamp: a.timestamp,
            x: a.x,
            y: a.y,
            comment: a.comment ?? "",
            color: a.color,
          })),
        });
      }
    });

    return NextResponse.json({ ok: true, count: annotations.length });
  } catch (err) {
    console.error("[POST /api/annotations] error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
