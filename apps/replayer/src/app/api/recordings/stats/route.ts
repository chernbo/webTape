/**
 * GET /api/recordings/stats
 *
 * 录屏使用统计 API.
 *
 * Query 参数:
 *   - days   最近 N 天 (默认 30)
 *   - by     维度: "page" | "day"  (默认 "page")
 *
 * 示例:
 *   /api/recordings/stats?by=page&days=30     最近 30 天 bug 高发页面
 *   /api/recordings/stats?by=day&days=14      最近 14 天每日录制趋势
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const days = Math.max(1, Math.min(365, Number(sp.get("days") || 30)));
  const by = (sp.get("by") || "page") as "page" | "day";

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    // 先取一些总览数字
    const [totalCount, recentCount, totalSize] = await Promise.all([
      db.recording.count(),
      db.recording.count({ where: { createdAt: { gte: since } } }),
      db.recording.aggregate({
        _sum: { size: true },
        where: { createdAt: { gte: since } },
      }),
    ]);

    let breakdown: Array<Record<string, unknown>> = [];

    if (by === "page") {
      // TOP 页面 (按录制条数)
      const rows = await db.recording.groupBy({
        by: ["pageUrl", "pageTitle"],
        where: {
          createdAt: { gte: since },
          pageUrl: { not: null },
        },
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 20,
      });
      breakdown = rows.map((r) => ({
        pageUrl: r.pageUrl,
        pageTitle: r.pageTitle,
        count: r._count._all,
      }));
    } else if (by === "day") {
      // 每日录制趋势 (用原生 SQL 因为 Prisma groupBy 不直接支持日期函数)
      const rows = await db.$queryRaw<
        Array<{ day: string; count: bigint }>
      >`
        SELECT DATE(created_at) AS day, COUNT(*) AS count
        FROM recordings
        WHERE created_at >= ${since}
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `;
      breakdown = rows.map((r) => ({
        day: r.day,
        count: Number(r.count),
      }));
    }

    return NextResponse.json({
      ok: true,
      summary: {
        days,
        totalCount,        // 历史所有录屏数
        recentCount,       // 最近 N 天录屏数
        totalSizeBytes: totalSize._sum.size || 0,
      },
      by,
      breakdown,
    });
  } catch (err) {
    console.error("[GET /api/recordings/stats] failed:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
