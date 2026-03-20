import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/tableman/db";
import { requireAdmin, unauthorizedResponse } from "@/lib/tableman/auth";

export const dynamic = "force-dynamic";

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

async function getTableColumns(tableName: string): Promise<ColumnInfo[]> {
  const db = pool();
  const columnsResult = await db.query(
    `
    SELECT 
      c.column_name,
      c.data_type,
      c.is_nullable
    FROM information_schema.columns c
    WHERE c.table_name = $1 
      AND c.table_schema = 'public'
    ORDER BY c.ordinal_position
  `,
    [tableName]
  );

  const pkResult = await db.query(
    `
    SELECT a.attname as column_name
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE i.indisprimary
      AND c.relname = $1
      AND n.nspname = 'public'
  `,
    [tableName]
  );

  const primaryKeys = new Set(pkResult.rows.map((row: { column_name: string }) => row.column_name));

  return columnsResult.rows.map((row: { column_name: string; data_type: string; is_nullable: string }) => ({
    name: row.column_name,
    type: row.data_type,
    nullable: row.is_nullable === "YES",
    isPrimaryKey: primaryKeys.has(row.column_name),
  }));
}

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

export async function GET(
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

    if (!(await tableExists(tableName))) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const columns = await getTableColumns(tableName);

    const searchParams = request.nextUrl.searchParams;
    const filters: { column: string; operator: string; value: string }[] = [];

    const OPERATORS = ["equals", "contains", "starts_with", "ends_with", "is_null", "is_not_null"];
    const columnNames = new Set(columns.map((c) => c.name));

    for (const [key, value] of searchParams.entries()) {
      if (!value || key === "page" || key === "pageSize") continue;

      const parts = key.split("__");
      if (parts.length === 2 && columnNames.has(parts[0]) && OPERATORS.includes(parts[1])) {
        filters.push({ column: parts[0], operator: parts[1], value });
      } else if (columnNames.has(key)) {
        filters.push({ column: key, operator: "equals", value });
      }
    }

    let query = `SELECT * FROM "${tableName}"`;
    const values: string[] = [];

    if (filters.length > 0) {
      let paramIndex = 0;
      const conditions = filters.map((filter) => {
        switch (filter.operator) {
          case "contains":
            paramIndex++;
            values.push(`%${filter.value}%`);
            return `"${filter.column}"::text ILIKE $${paramIndex}`;
          case "starts_with":
            paramIndex++;
            values.push(`${filter.value}%`);
            return `"${filter.column}"::text ILIKE $${paramIndex}`;
          case "ends_with":
            paramIndex++;
            values.push(`%${filter.value}`);
            return `"${filter.column}"::text ILIKE $${paramIndex}`;
          case "is_null":
            return `"${filter.column}" IS NULL`;
          case "is_not_null":
            return `"${filter.column}" IS NOT NULL`;
          case "equals":
          default:
            paramIndex++;
            values.push(filter.value);
            return `"${filter.column}"::text = $${paramIndex}`;
        }
      });
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    const offset = (page - 1) * pageSize;

    query += ` LIMIT ${pageSize} OFFSET ${offset}`;

    const result = await db.query(query, values);

    let countQuery = `SELECT COUNT(*) as total FROM "${tableName}"`;
    const countValues: string[] = [];
    if (filters.length > 0) {
      let countParamIndex = 0;
      const conditions = filters.map((filter) => {
        switch (filter.operator) {
          case "contains":
            countParamIndex++;
            countValues.push(`%${filter.value}%`);
            return `"${filter.column}"::text ILIKE $${countParamIndex}`;
          case "starts_with":
            countParamIndex++;
            countValues.push(`${filter.value}%`);
            return `"${filter.column}"::text ILIKE $${countParamIndex}`;
          case "ends_with":
            countParamIndex++;
            countValues.push(`%${filter.value}`);
            return `"${filter.column}"::text ILIKE $${countParamIndex}`;
          case "is_null":
            return `"${filter.column}" IS NULL`;
          case "is_not_null":
            return `"${filter.column}" IS NOT NULL`;
          case "equals":
          default:
            countParamIndex++;
            countValues.push(filter.value);
            return `"${filter.column}"::text = $${countParamIndex}`;
        }
      });
      countQuery += ` WHERE ${conditions.join(" AND ")}`;
    }
    const countResult = await db.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total, 10);

    return NextResponse.json({
      columns,
      rows: result.rows,
      total,
    });
  } catch (error) {
    console.error("Error fetching table data:", error);
    return NextResponse.json(
      { error: "Failed to fetch table data" },
      { status: 500 }
    );
  }
}
