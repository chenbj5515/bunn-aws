"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FilterBar } from "../../../_components/filter-bar";
import { DataTable } from "../../../_components/data-table";
import { Table2, ArrowLeft } from "lucide-react";
import { fetchTableData, deleteTableRows } from "../../../_actions";

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

interface TableDetailClientProps {
  tableName: string;
  initialData: TableData;
  pageSize: number;
}

export function TableDetailClient({
  tableName,
  initialData,
  pageSize,
}: TableDetailClientProps) {
  const [tableData, setTableData] = useState<TableData>(initialData);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTableData = useCallback(
    async (currentPage: number, currentFilters: Record<string, string>) => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await fetchTableData(
          tableName,
          currentPage,
          pageSize,
          currentFilters
        );

        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setTableData(result.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "获取表数据失败");
      } finally {
        setIsLoading(false);
      }
    },
    [tableName, pageSize]
  );

  const handleFilterChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setPage(1);
    loadTableData(1, newFilters);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadTableData(newPage, filters);
  };

  const handleDelete = async (ids: (string | number)[]) => {
    try {
      const result = await deleteTableRows(tableName, ids);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`成功删除 ${result.deleted} 行数据`);
        loadTableData(page, filters);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  return (
    <div className="p-6 lg:p-8 h-full flex flex-col">
      <div className="mb-6">
        <Link
          href="/tableman"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors mb-3"
        >
          <ArrowLeft className="size-4" />
          返回数据库一览
        </Link>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-neutral-900 flex items-center justify-center">
            <Table2 className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 text-balance">
              {tableName}
            </h1>
            <p className="text-neutral-500 text-sm">数据表</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-pretty">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-200 flex-1 flex flex-col min-h-0 overflow-hidden">
        <FilterBar
          columns={tableData.columns}
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        <DataTable
          columns={tableData.columns}
          rows={tableData.rows}
          total={tableData.total}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          onDelete={handleDelete}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
