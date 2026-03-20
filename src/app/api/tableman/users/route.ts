import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/tableman/db";
import { requireAdmin, unauthorizedResponse } from "@/lib/tableman/auth";

export const dynamic = "force-dynamic";

const USERS_TABLE = "user";

const COLUMN_ALIASES: Record<string, string[]> = {
  id: ["id", "user_id"],
  email: ["email", "username", "name", "user_email"],
  createdAt: ["created_at", "created", "register_time", "registered_at", "createdAt"],
  tokenUsage: [
    "token_usage",
    "tokens_used",
    "usage_tokens",
    "total_tokens",
    "tokenUsage",
  ],
  isPaid: [
    "is_paid",
    "is_paid_user",
    "is_premium",
    "subscription_type",
    "plan",
    "tier",
    "isPaid",
  ],
  isAdmin: [
    "is_admin",
    "isAdmin",
    "is_administrator",
    "admin",
    "role",
  ],
};

async function usersTableExists(): Promise<boolean> {
  const db = pool();
  const result = await db.query(
    `
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name = $1
  `,
    [USERS_TABLE]
  );
  return result.rows.length > 0;
}

function findColumn(
  columns: { name: string }[],
  aliases: string[]
): string | null {
  const columnNames = new Set(columns.map((c) => c.name.toLowerCase()));
  for (const alias of aliases) {
    if (columnNames.has(alias.toLowerCase())) {
      const found = columns.find(
        (c) => c.name.toLowerCase() === alias.toLowerCase()
      );
      return found?.name ?? null;
    }
  }
  return null;
}

async function getTableColumns(): Promise<{ name: string }[]> {
  const db = pool();
  const result = await db.query(
    `
    SELECT column_name as name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `,
    [USERS_TABLE]
  );
  return result.rows;
}

async function getPrimaryKey(): Promise<string | null> {
  const db = pool();
  const result = await db.query(
    `
    SELECT a.attname as column_name
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE i.indisprimary
      AND c.relname = $1
      AND n.nspname = 'public'
    LIMIT 1
  `,
    [USERS_TABLE]
  );
  return result.rows.length > 0 ? result.rows[0].column_name : null;
}

function normalizeValue(value: unknown, field: string): unknown {
  if (value === null || value === undefined) return value;
  if (field === "isPaid") {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      return (
        lower === "true" ||
        lower === "1" ||
        lower === "yes" ||
        lower === "premium" ||
        lower === "paid" ||
        lower === "pro"
      );
    }
    if (typeof value === "number") return value !== 0;
  }
  if (field === "isAdmin") {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      return lower === "admin" || lower === "administrator";
    }
    if (typeof value === "number") return value !== 0;
  }
  if (field === "createdAt" && value) {
    if (value instanceof Date) return value.toISOString();
  }
  return value;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  try {
    if (!(await usersTableExists())) {
      return NextResponse.json({
        tableExists: false,
        columns: [],
        rows: [],
        total: 0,
        columnMap: {},
      });
    }

    const db = pool();
    const columns = await getTableColumns();
    const pkColumn = await getPrimaryKey();

    const columnMap: Record<string, string | null> = {};
    for (const [target, aliases] of Object.entries(COLUMN_ALIASES)) {
      columnMap[target] = findColumn(columns, aliases);
    }
    columnMap.id = pkColumn ?? columnMap.id ?? columns[0]?.name ?? null;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(10, parseInt(searchParams.get("pageSize") || "50", 10))
    );
    const offset = (page - 1) * pageSize;
    const adminFilter = searchParams.get("isAdmin");

    const orderColumn =
      columnMap.createdAt ?? columnMap.id ?? columns[0]?.name ?? "id";

    let whereClause = "";
    const queryParams: (number | string)[] = [pageSize, offset];
    
    if (adminFilter !== null && columnMap.isAdmin) {
      if (adminFilter === "true") {
        whereClause = `WHERE "${columnMap.isAdmin}" = $3`;
        queryParams.push("admin");
      } else {
        whereClause = `WHERE "${columnMap.isAdmin}" != $3`;
        queryParams.push("admin");
      }
    }

    const result = await db.query(
      `SELECT * FROM "${USERS_TABLE}" ${whereClause} ORDER BY "${orderColumn}" DESC NULLS LAST LIMIT $1 OFFSET $2`,
      queryParams
    );

    const countParams: string[] = [];
    let countWhereClause = "";
    if (adminFilter !== null && columnMap.isAdmin) {
      if (adminFilter === "true") {
        countWhereClause = `WHERE "${columnMap.isAdmin}" = $1`;
        countParams.push("admin");
      } else {
        countWhereClause = `WHERE "${columnMap.isAdmin}" != $1`;
        countParams.push("admin");
      }
    }

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM "${USERS_TABLE}" ${countWhereClause}`,
      countParams
    );
    const total = parseInt(countResult.rows[0]?.total ?? "0", 10);

    const rows = result.rows.map((raw: Record<string, unknown>) => {
      const row: Record<string, unknown> = { ...raw };
      for (const [target, sourceColumn] of Object.entries(columnMap)) {
        if (sourceColumn && raw[sourceColumn] !== undefined) {
          row[target] = normalizeValue(raw[sourceColumn], target);
        }
      }
      return row;
    });

    return NextResponse.json({
      tableExists: true,
      columns: columns.map((c) => ({ name: c.name, type: "unknown" })),
      rows,
      total,
      columnMap,
      pkColumn,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
