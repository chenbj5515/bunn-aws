import { pool } from "@/lib/tableman/db";
import { TableDetailClient } from "./_components/table-detail-client";

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

interface TableData {
  columns: Column[];
  rows: Record<string, unknown>[];
  total: number;
}

const PAGE_SIZE = 50;

async function getTableColumns(tableName: string): Promise<Column[]> {
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

  const primaryKeys = new Set(
    pkResult.rows.map((row: { column_name: string }) => row.column_name)
  );

  return columnsResult.rows.map(
    (row: { column_name: string; data_type: string; is_nullable: string }) => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === "YES",
      isPrimaryKey: primaryKeys.has(row.column_name),
    })
  );
}

async function getTableData(tableName: string): Promise<TableData> {
  const db = pool();
  const columns = await getTableColumns(tableName);

  const result = await db.query(
    `SELECT * FROM "${tableName}" LIMIT ${PAGE_SIZE} OFFSET 0`
  );

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM "${tableName}"`
  );
  const total = parseInt(countResult.rows[0].total, 10);

  return {
    columns,
    rows: result.rows,
    total,
  };
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

interface TablePageProps {
  params: Promise<{ name: string }>;
}

export default async function TablePage({ params }: TablePageProps) {
  const { name: tableName } = await params;

  const exists = await tableExists(tableName);
  if (!exists) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-pretty">
          表 &quot;{tableName}&quot; 不存在
        </div>
      </div>
    );
  }

  const initialData = await getTableData(tableName);

  return (
    <TableDetailClient
      tableName={tableName}
      initialData={initialData}
      pageSize={PAGE_SIZE}
    />
  );
}
