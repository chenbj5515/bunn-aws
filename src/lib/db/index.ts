import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * 数据库连接层 - 支持多环境()
 * 
 * 统一使用 postgres-js 驱动（标准 PostgreSQL）
 */

const rawDatabaseUrl = process.env.DATABASE_URL;
if (!rawDatabaseUrl) {
  throw new Error("DATABASE_URL is required for build/runtime database initialization");
}
// CI secrets 常见会带首尾空白或包裹引号，统一清洗避免 URL 解析异常
const databaseUrl = rawDatabaseUrl.trim().replace(/^['"]|['"]$/g, "");

// 根据环境创建数据库连接
function createDbConnection() {
  // 统一走标准 PostgreSQL 驱动
  const sql = postgres(databaseUrl, {
    max: 10, // 连接池大小
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzlePostgres(sql, { schema });
}

// Create the drizzle instance with schema
export const db = createDbConnection();

// Export schema for convenience
export * from "./schema";
