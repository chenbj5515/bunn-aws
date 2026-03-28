import { pool } from "@/lib/tableman/db";

interface TableColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
  ordinal_position: number;
}

interface PrimaryKeyRow {
  table_name: string;
  column_name: string;
}

interface ForeignKeyRow {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

export interface SchemaForeignKey {
  columnName: string;
  foreignTableName: string;
  foreignColumnName: string;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
  foreignKeys: SchemaForeignKey[];
}

function formatColumnType(row: TableColumnRow) {
  if (row.data_type === "USER-DEFINED") {
    return row.udt_name;
  }

  return row.data_type;
}

export async function getPublicSchemaMetadata(): Promise<SchemaTable[]> {
  const db = pool();

  const [columnsResult, primaryKeysResult, foreignKeysResult] = await Promise.all([
    db.query<TableColumnRow>(
      `
      SELECT
        table_name,
        column_name,
        data_type,
        udt_name,
        is_nullable,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
      `
    ),
    db.query<PrimaryKeyRow>(
      `
      SELECT
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY tc.table_name, kcu.ordinal_position
      `
    ),
    db.query<ForeignKeyRow>(
      `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.ordinal_position
      `
    ),
  ]);

  const primaryKeysByTable = new Map<string, Set<string>>();
  for (const row of primaryKeysResult.rows) {
    const set = primaryKeysByTable.get(row.table_name) ?? new Set<string>();
    set.add(row.column_name);
    primaryKeysByTable.set(row.table_name, set);
  }

  const foreignKeysByTable = new Map<string, SchemaForeignKey[]>();
  for (const row of foreignKeysResult.rows) {
    const list = foreignKeysByTable.get(row.table_name) ?? [];
    list.push({
      columnName: row.column_name,
      foreignTableName: row.foreign_table_name,
      foreignColumnName: row.foreign_column_name,
    });
    foreignKeysByTable.set(row.table_name, list);
  }

  const tablesByName = new Map<string, SchemaTable>();
  for (const row of columnsResult.rows) {
    const table = tablesByName.get(row.table_name) ?? {
      name: row.table_name,
      columns: [],
      foreignKeys: foreignKeysByTable.get(row.table_name) ?? [],
    };

    table.columns.push({
      name: row.column_name,
      type: formatColumnType(row),
      nullable: row.is_nullable === "YES",
      isPrimaryKey: primaryKeysByTable.get(row.table_name)?.has(row.column_name) ?? false,
    });

    tablesByName.set(row.table_name, table);
  }

  return Array.from(tablesByName.values());
}

export async function getPublicSchemaContext(): Promise<string> {
  const tables = await getPublicSchemaMetadata();

  return tables
    .map((table) => {
      const columns = table.columns
        .map((column) => {
          const parts = [column.name, column.type];

          if (column.isPrimaryKey) {
            parts.push("pk");
          }

          if (!column.nullable) {
            parts.push("not null");
          }

          return parts.join(" ");
        })
        .join(", ");

      const foreignKeys =
        table.foreignKeys.length > 0
          ? ` refs: ${table.foreignKeys
              .map((fk) => `${fk.columnName} -> ${fk.foreignTableName}.${fk.foreignColumnName}`)
              .join("; ")}`
          : "";

      return `table ${table.name} (${columns})${foreignKeys}`;
    })
    .join("\n");
}
