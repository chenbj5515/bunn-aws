import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "@/lib/tableman/auth";
import { pool } from "@/lib/tableman/db";

export async function POST(request: NextRequest) {
  // 核心安全：Admin 鉴权
  const authResult = await requireAdmin();
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult);
  }

  const db = pool();

  try {
    const body = await request.json();
    const { sql } = body as { sql: string };

    if (!sql?.trim()) {
      return NextResponse.json({ error: "SQL is required" }, { status: 400 });
    }

    const client = await db.connect();

    try {
      const startTime = Date.now();
      const result = await client.query(sql.trim());
      const duration = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        rows: result.rows || [],
        rowCount: result.rowCount ?? result.rows?.length ?? 0,
        fields: result.fields?.map((f) => ({ name: f.name })),
        duration,
        command: result.command,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
