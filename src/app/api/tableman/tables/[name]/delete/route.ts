import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/tableman/db";
import { requireAdmin, unauthorizedResponse } from "@/lib/tableman/auth";

export const dynamic = "force-dynamic";

async function tableExists(tableName: string): Promise<boolean> {
  const db = pool();
  const result = await db.query(
    `
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name = $1
  `,
    [tableName]
  );
  return result.rows.length > 0;
}

async function getPrimaryKeyColumn(tableName: string): Promise<string | null> {
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
    [tableName]
  );

  return result.rows.length > 0 ? result.rows[0].column_name : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  try {
    const db = pool();
    const { name: tableName } = await params;
    const body = await request.json();
    const { ids } = body as { ids: (string | number)[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      );
    }

    if (!(await tableExists(tableName))) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const pkColumn = await getPrimaryKeyColumn(tableName);
    if (!pkColumn) {
      return NextResponse.json(
        { error: "Table has no primary key" },
        { status: 400 }
      );
    }

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(", ");
    const query = `DELETE FROM "${tableName}" WHERE "${pkColumn}" IN (${placeholders})`;

    const result = await db.query(query, ids);

    return NextResponse.json({
      deleted: result.rowCount,
    });
  } catch (error) {
    console.error("Error deleting rows:", error);
    return NextResponse.json(
      { error: "Failed to delete rows" },
      { status: 500 }
    );
  }
}
