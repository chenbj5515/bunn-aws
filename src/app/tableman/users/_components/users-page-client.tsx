"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { UsersTable, type UserRow } from "../../_components/users-table";
import { Users } from "lucide-react";
import { fetchUsersData, deleteUsers } from "../../_actions";

interface UsersData {
  tableExists: boolean;
  rows: UserRow[];
  total: number;
  columnMap: Record<string, string | null>;
}

interface UsersPageClientProps {
  initialData: UsersData;
  pageSize: number;
}

export function UsersPageClient({
  initialData,
  pageSize,
}: UsersPageClientProps) {
  const [data, setData] = useState<UsersData>(initialData);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminFilter, setAdminFilter] = useState<boolean | null>(null);

  const loadUsers = useCallback(
    async (currentPage: number, currentAdminFilter: boolean | null) => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await fetchUsersData(
          currentPage,
          pageSize,
          currentAdminFilter
        );

        if (result.error) {
          setError(result.error);
          toast.error(result.error);
        } else if (result.data) {
          setData(result.data);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "获取用户列表失败";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize]
  );

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadUsers(newPage, adminFilter);
  };

  const handleAdminFilterChange = (value: boolean | null) => {
    setAdminFilter(value);
    setPage(1);
    loadUsers(1, value);
  };

  const handleDelete = async (ids: (string | number)[]) => {
    try {
      const result = await deleteUsers(ids);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`成功删除 ${result.deleted} 个用户`);
        loadUsers(page, adminFilter);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  return (
    <div className="flex flex-col p-6 lg:p-8 h-full">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex justify-center items-center bg-neutral-900 rounded-xl size-10">
            <Users className="size-5 text-white" />
          </div>
          <h1 className="font-semibold text-neutral-900 text-2xl text-balance">
            用户管理
          </h1>
        </div>
        <p className="text-neutral-500 text-pretty">
          查看用户信息、Token使用情况和付费状态
        </p>
      </div>

      {error && (
        <div className="bg-red-50 mb-4 p-4 rounded-xl text-red-600 text-pretty">
          {error}
        </div>
      )}

      <div className="flex flex-col flex-1 bg-white border border-neutral-200 rounded-2xl min-h-0 overflow-hidden">
        <UsersTable
          rows={data.rows}
          total={data.total}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          tableExists={data.tableExists}
          adminFilter={adminFilter}
          hasAdminColumn={!!data.columnMap?.isAdmin}
          onDelete={handleDelete}
          onPageChange={handlePageChange}
          onAdminFilterChange={handleAdminFilterChange}
        />
      </div>
    </div>
  );
}
