import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isDev = process.env.NODE_ENV === "development";

// Client 单例模式（防止频繁new出 PrismaClient,导致 MySQL 连接数暴涨。）
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev
      ? [
          { level: "query", emit: "event" },
          { level: "error", emit: "stdout" },
          { level: "warn", emit: "stdout" },
        ]
      : [{ level: "error", emit: "stdout" }],
  });

if (isDev && !globalForPrisma.prisma) {
  // 把 SQL 和参数一起打印, 方便调试
  // (event 监听只在第一次创建实例时绑定, 避免热重载累积监听)
  db.$on("query", (e) => {
    console.log(`📝 [${e.duration}ms] ${e.query}`);
    console.log(`   params: ${e.params}`);
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
