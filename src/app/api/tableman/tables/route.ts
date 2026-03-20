import { NextResponse } from "next/server";
import { pool } from "@/lib/tableman/db";
import { requireAdmin, unauthorizedResponse } from "@/lib/tableman/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  try {
    const db = pool();
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = result.rows.map((row: { table_name: string }) => row.table_name);

    return NextResponse.json({ tables });
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      { error: "Failed to fetch tables" },
      { status: 500 }
    );
  }
}
