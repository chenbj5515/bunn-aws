"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Users, Database, Shield, ShieldCheck } from "lucide-react";

export interface UserRow {
  id?: string | number;
  email?: string;
  username?: string;
  name?: string;
  createdAt?: string;
  tokenUsage?: number | string;
  isPaid?: boolean;
  isAdmin?: boolean;
  [key: string]: unknown;
}

interface UsersTableProps {
  rows: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  tableExists: boolean;
  adminFilter: boolean | null;
  hasAdminColumn: boolean;
  onDelete: (ids: (string | number)[]) => Promise<void>;
  onPageChange: (page: number) => void;
  onAdminFilterChange: (value: boolean | null) => void;
}

function formatTokenUsage(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString("zh-CN");
}

function formatDate(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) {
    return value.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const str = String(value);
  const parsed = Date.parse(str);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return str;
}

export function UsersTable({
  rows,
  total,
  page,
  pageSize,
  isLoading,
  tableExists,
  adminFilter,
  hasAdminColumn,
  onDelete,
  onPageChange,
  onAdminFilterChange,
}: UsersTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set()
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const getRowId = (row: UserRow): string | number | null => {
    const value = row.id ?? row.user_id;
    if (typeof value === "string" || typeof value === "number") return value;
    return null;
  };

  const toggleRowSelection = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = rows
        .map(getRowId)
        .filter((id): id is string | number => id !== null);
      setSelectedIds(new Set(allIds));
    }
  };

  const handleDeleteClick = () => {
    if (selectedIds.size === 0) return;
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!tableExists) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <div className="size-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
          <Database className="size-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-medium text-neutral-900 mb-2 text-balance text-center">
          未找到 user 表
        </h3>
        <p className="text-neutral-500 text-sm text-center max-w-md text-pretty">
          数据库中不存在 user 表。请确保已创建包含 id、email、created_at 等字段的用户表。
        </p>
        <div className="mt-6 p-4 bg-neutral-50 rounded-xl text-xs font-mono text-neutral-600 max-w-md">
          <pre className="whitespace-pre-wrap">
{`CREATE TABLE "user" (
  id UUID PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ,
  token_usage BIGINT,
  is_paid BOOLEAN
);`}
          </pre>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-500">
        加载中...
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);
  const startRow = (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, total);

  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("ellipsis");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex justify-between items-center px-5 h-14 border-b border-neutral-100">
        <div className="flex items-center gap-4">
          <div className="text-neutral-500 text-sm tabular-nums">
            共 {total} 个用户
            {total > 0 && `，显示第 ${startRow}-${endRow} 个`}
            {selectedIds.size > 0 && (
              <span className="ml-2 text-neutral-900 font-medium">
                已选择 {selectedIds.size} 个
              </span>
            )}
          </div>
          {hasAdminColumn && (
            <div className="flex items-center gap-1.5">
              <Button
                variant={adminFilter === true ? "default" : "outline"}
                size="sm"
                onClick={() => onAdminFilterChange(adminFilter === true ? null : true)}
                className="rounded-lg h-8 px-3 text-xs gap-1.5"
              >
                <ShieldCheck className="size-3.5" />
                管理员
              </Button>
              <Button
                variant={adminFilter === false ? "default" : "outline"}
                size="sm"
                onClick={() => onAdminFilterChange(adminFilter === false ? null : false)}
                className="rounded-lg h-8 px-3 text-xs gap-1.5"
              >
                <Shield className="size-3.5" />
                普通用户
              </Button>
            </div>
          )}
        </div>
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            aria-label="删除选中的用户"
            className="rounded-lg"
          >
            <Trash2 className="size-4" />
            {isDeleting ? "删除中..." : `删除 (${selectedIds.size})`}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="size-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <Users className="size-7 text-neutral-400" />
            </div>
            <p className="text-neutral-500 text-pretty">暂无用户数据</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-neutral-100">
                <TableHead className="top-0 z-10 sticky bg-white w-10 px-3">
                  <Checkbox
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="全选"
                  />
                </TableHead>
                <TableHead className="top-0 z-10 sticky bg-white text-neutral-600 font-medium">
                  用户标识
                </TableHead>
                <TableHead className="top-0 z-10 sticky bg-white text-neutral-600 font-medium">
                  Token 使用量
                </TableHead>
                <TableHead className="top-0 z-10 sticky bg-white text-neutral-600 font-medium">
                  注册时间
                </TableHead>
                <TableHead className="top-0 z-10 sticky bg-white text-neutral-600 font-medium">
                  付费状态
                </TableHead>
                {hasAdminColumn && (
                  <TableHead className="top-0 z-10 sticky bg-white text-neutral-600 font-medium">
                    角色
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => {
                const rowId = getRowId(row);
                const isSelected = rowId !== null && selectedIds.has(rowId);
                return (
                  <TableRow
                    key={rowId !== null ? `${rowId}-${index}` : index}
                    data-state={isSelected ? "selected" : undefined}
                    className="border-neutral-100"
                  >
                    <TableCell className="w-10 px-3">
                      {rowId !== null && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRowSelection(rowId)}
                          aria-label={`选择用户 ${rowId}`}
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-neutral-900 max-w-[240px]">
                      <span className="truncate block">
                        {String(
                          row.email ?? row.username ?? row.name ?? row.id ?? "—"
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-neutral-600">
                      {formatTokenUsage(row.tokenUsage)}
                    </TableCell>
                    <TableCell className="tabular-nums text-neutral-600">
                      {formatDate(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      {row.isPaid === true ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          付费
                        </span>
                      ) : row.isPaid === false ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                          免费
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </TableCell>
                    {hasAdminColumn && (
                      <TableCell>
                        {row.isAdmin === true ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <ShieldCheck className="size-3" />
                            管理员
                          </span>
                        ) : row.isAdmin === false ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                            普通用户
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end items-center px-5 py-4 border-t border-neutral-100">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1}
                />
              </PaginationItem>
              {getPageNumbers().map((pageNum, index) =>
                pageNum === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      isActive={pageNum === page}
                      onClick={() => onPageChange(pageNum)}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription className="text-pretty">
              确定要删除选中的 {selectedIds.size} 个用户吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="rounded-lg"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="rounded-lg"
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
