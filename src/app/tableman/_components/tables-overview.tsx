"use client";

import Link from "next/link";
import { Table2, ArrowRight, Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface TablesOverviewProps {
  tables: string[];
}

export function TablesOverview({ tables }: TablesOverviewProps) {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-10 rounded-xl bg-neutral-900 flex items-center justify-center">
            <Database className="size-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 text-balance">
            数据库一览
          </h1>
        </div>
        <p className="text-neutral-500 text-pretty">
          查看和管理数据库中的所有表
        </p>
      </div>

      {tables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <Database className="size-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500 text-pretty">数据库中没有找到表</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <Link
              key={table}
              href={`/tableman/tables/${encodeURIComponent(table)}`}
              className={cn(
                "group bg-white rounded-2xl border border-neutral-200 p-5",
                "hover:border-neutral-300 hover:shadow-sm transition-all"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="size-11 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:bg-neutral-900 transition-colors">
                  <Table2 className="size-5 text-neutral-600 group-hover:text-white transition-colors" />
                </div>
                <ArrowRight className="size-5 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
              </div>
              <h3 className="font-medium text-neutral-900 truncate text-balance">
                {table}
              </h3>
              <p className="text-sm text-neutral-400 mt-1">数据表</p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 text-sm text-neutral-400 tabular-nums">
        共 {tables.length} 个表
      </div>
    </div>
  );
}
