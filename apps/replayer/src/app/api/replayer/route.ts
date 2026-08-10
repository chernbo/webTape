/**
 * POST /api/replayer
 *
 * 录屏上传接口:
 *   - 直接写入 MySQL recordings 表 (通过 Prisma)
 *
 * 请求 body: { rrwebEvents: any[] }
 * 响应: { ok: true, data: { sourceId, url } }
 *
 * 录制数据全部存 MySQL（无对象存储依赖）。
 * All recording data is stored in MySQL (no object storage dependency).
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
// rrweb events 可能很大 (几 MB), 给足上传配额
export const maxDuration = 60;

interface UploadBody {
  rrwebEvents?: unknown;
  pageUrl?: string;
  pageTitle?: string;
}

// 字段长度上限 (跟 schema 对齐, 防止超长导致 INSERT 失败)
const truncate = (s: string | undefined | null, max: number) =>
  s ? s.slice(0, max) : null;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UploadBody;
    const events = body?.rrwebEvents;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { ok: false, error: "rrwebEvents must be a non-empty array" },
        { status: 400 },
      );
    }

    // 生成 32 位 hex 作为录制唯一标识 / random 32-hex id as the recording id
    const sourceId = crypto.randomBytes(16).toString("hex");
    const eventsJson = JSON.stringify(events);

    // 推算时长: 最后一帧 - 第一帧
    const first = (events[0] as { timestamp?: number })?.timestamp ?? 0;
    const last =
      (events[events.length - 1] as { timestamp?: number })?.timestamp ?? 0;
    const duration = Math.max(0, last - first);

    await db.recording.create({
      data: {
        id: sourceId,
        events: eventsJson,
        size: Buffer.byteLength(eventsJson, "utf-8"),
        duration,
        pageUrl: truncate(body?.pageUrl, 512),
        pageTitle: truncate(body?.pageTitle, 200),
      },
    });

    // 拼绝对 URL, 业务方直接用不需要再补 host.
    // 部署到线上时通过 REPLAYER_PUBLIC_URL 显式注入对外域名;
    // 未配置时兜底到 nextUrl.origin (本地开发场景, 同源).
    const origin =
      process.env.REPLAYER_PUBLIC_URL?.replace(/\/+$/, "") ||
      request.nextUrl.origin;

    return NextResponse.json({
      ok: true,
      data: {
        sourceId,
        url: `${origin}/replayer?sourceId=${sourceId}`,
      },
    });
  } catch (err) {
    console.error("[POST /api/replayer] failed:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
