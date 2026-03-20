import { pool } from "@/lib/tableman/db";
import { TablesOverview } from "./_components/tables-overview";

async function getTables(): Promise<string[]> {
  const db = pool();
  const result = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map((row: { table_name: string }) => row.table_name);
}

export default async function DatabaseOverviewPage() {
  const tables = await getTables();

  return <TablesOverview tables={tables} />;
}
