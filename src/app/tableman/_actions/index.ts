"use server";

import { pool } from "@/lib/tableman/db";
import { requireAdmin } from "@/lib/tableman/auth";
import type { UserRow } from "../_components/users-table";

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

interface UsersData {
  tableExists: boolean;
  rows: UserRow[];
  total: number;
  columnMap: Record<string, string | null>;
}

const USERS_TABLE = "user";

const COLUMN_ALIASES: Record<string, string[]> = {
  id: ["id", "user_id"],
  email: ["email", "username", "name", "user_email"],
  createdAt: [
    "created_at",
    "created",
    "register_time",
    "registered_at",
    "createdAt",
  ],
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
  isAdmin: ["is_admin", "isAdmin", "is_administrator", "admin", "role"],
};

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

export async function fetchTableData(
  tableName: string,
  page: number,
  pageSize: number,
  filters: Record<string, string>
): Promise<{ data?: TableData; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.message };
  }

  try {
    const db = pool();
    const columns = await getTableColumns(tableName);

    const OPERATORS = [
      "equals",
      "contains",
      "starts_with",
      "ends_with",
      "is_null",
      "is_not_null",
    ];
    const columnNames = new Set(columns.map((c) => c.name));

    const parsedFilters: { column: string; operator: string; value: string }[] =
      [];
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      const parts = key.split("__");
      if (
        parts.length === 2 &&
        columnNames.has(parts[0]) &&
        OPERATORS.includes(parts[1])
      ) {
        parsedFilters.push({ column: parts[0], operator: parts[1], value });
      } else if (columnNames.has(key)) {
        parsedFilters.push({ column: key, operator: "equals", value });
      }
    }

    let query = `SELECT * FROM "${tableName}"`;
    const values: string[] = [];

    if (parsedFilters.length > 0) {
      let paramIndex = 0;
      const conditions = parsedFilters.map((filter) => {
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

    const offset = (page - 1) * pageSize;
    query += ` LIMIT ${pageSize} OFFSET ${offset}`;

    const result = await db.query(query, values);

    let countQuery = `SELECT COUNT(*) as total FROM "${tableName}"`;
    const countValues: string[] = [];
    if (parsedFilters.length > 0) {
      let countParamIndex = 0;
      const conditions = parsedFilters.map((filter) => {
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

    return {
      data: {
        columns,
        rows: result.rows,
        total,
      },
    };
  } catch (err) {
    console.error("Error fetching table data:", err);
    return { error: "获取表数据失败" };
  }
}

export async function deleteTableRows(
  tableName: string,
  ids: (string | number)[]
): Promise<{ deleted?: number; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.message };
  }

  try {
    const db = pool();
    const pkColumn = await getPrimaryKeyColumn(tableName);
    if (!pkColumn) {
      return { error: "表没有主键" };
    }

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(", ");
    const query = `DELETE FROM "${tableName}" WHERE "${pkColumn}" IN (${placeholders})`;
    const result = await db.query(query, ids);

    return { deleted: result.rowCount ?? 0 };
  } catch (err) {
    console.error("Error deleting rows:", err);
    return { error: "删除失败" };
  }
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

async function getUsersTableColumns(): Promise<{ name: string }[]> {
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

async function getUsersPrimaryKey(): Promise<string | null> {
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

export async function fetchUsersData(
  page: number,
  pageSize: number,
  adminFilter: boolean | null
): Promise<{ data?: UsersData; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.message };
  }

  try {
    if (!(await usersTableExists())) {
      return {
        data: {
          tableExists: false,
          rows: [],
          total: 0,
          columnMap: {},
        },
      };
    }

    const db = pool();
    const columns = await getUsersTableColumns();
    const pkColumn = await getUsersPrimaryKey();

    const columnMap: Record<string, string | null> = {};
    for (const [target, aliases] of Object.entries(COLUMN_ALIASES)) {
      columnMap[target] = findColumn(columns, aliases);
    }
    columnMap.id = pkColumn ?? columnMap.id ?? columns[0]?.name ?? null;

    const offset = (page - 1) * pageSize;
    const orderColumn =
      columnMap.createdAt ?? columnMap.id ?? columns[0]?.name ?? "id";

    let whereClause = "";
    const queryParams: (number | string)[] = [pageSize, offset];

    if (adminFilter !== null && columnMap.isAdmin) {
      if (adminFilter === true) {
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
      if (adminFilter === true) {
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
    }) as UserRow[];

    return {
      data: {
        tableExists: true,
        rows,
        total,
        columnMap,
      },
    };
  } catch (err) {
    console.error("Error fetching users:", err);
    return { error: "获取用户列表失败" };
  }
}

export async function deleteUsers(
  ids: (string | number)[]
): Promise<{ deleted?: number; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.message };
  }

  try {
    if (!(await usersTableExists())) {
      return { error: "用户表不存在" };
    }

    const db = pool();
    const pkColumn = await getUsersPrimaryKey();
    if (!pkColumn) {
      return { error: "用户表没有主键" };
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const query = `DELETE FROM "${USERS_TABLE}" WHERE "${pkColumn}" IN (${placeholders})`;
    const result = await db.query(query, ids);

    return { deleted: result.rowCount ?? 0 };
  } catch (err) {
    console.error("Error deleting users:", err);
    return { error: "删除失败" };
  }
}
