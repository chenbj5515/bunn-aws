import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { neon } from "@neondatabase/serverless";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * 数据库连接层 - 支持多环境
 * 
 * 根据 DATABASE_URL 自动选择驱动：
 * - Neon (*.neon.tech): 使用 neon-http 驱动（Serverless 优化）
 * - 本地/RDS: 使用 postgres-js 驱动（标准 PostgreSQL）
 */

const databaseUrl = process.env.DATABASE_URL!;
const isNeonDatabase = databaseUrl.includes("neon.tech");

// 根据环境创建数据库连接
function createDbConnection() {
  if (isNeonDatabase) {
    // Neon Serverless - 使用 HTTP 驱动
    const sql = neon(databaseUrl);
    return drizzleNeon(sql, { schema });
  } else {
    // 本地 Docker / AWS RDS - 使用标准 PostgreSQL 驱动
    const sql = postgres(databaseUrl, {
      max: 10, // 连接池大小
      idle_timeout: 20,
      connect_timeout: 10,
    });
    return drizzlePostgres(sql, { schema });
  }
}

// Create the drizzle instance with schema
export const db = createDbConnection();

// Export schema for convenience
export * from "./schema";
