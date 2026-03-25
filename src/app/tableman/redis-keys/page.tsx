import { pool } from "@/lib/tableman/db";
import { RedisKeysPageClient } from "./_components/redis-keys-page-client";

export interface UserOption {
  id: string;
  email: string;
}

const USERS_TABLE = "user";

async function getUsers(): Promise<UserOption[]> {
  try {
    const db = pool();
    
    const tableCheck = await db.query(
      `SELECT 1 FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = $1`,
      [USERS_TABLE]
    );
    
    if (tableCheck.rows.length === 0) {
      return [];
    }

    const result = await db.query(
      `SELECT id, email FROM "${USERS_TABLE}" ORDER BY "createdAt" DESC NULLS LAST LIMIT 100`
    );

    return result.rows.map((row: { id?: string | number; email?: string }) => ({
      id: String(row.id ?? ""),
      email: String(row.email ?? "未知"),
    }));
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return [];
  }
}

export default async function RedisKeysPage() {
  const users = await getUsers();
  return <RedisKeysPageClient users={users} />;
}
