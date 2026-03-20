"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
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
import { Trash2, Table2 } from "lucide-react";

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

interface DataTableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onDelete: (ids: (string | number)[]) => Promise<void>;
  onPageChange: (page: number) => void;
}

export function DataTable({
  columns,
  rows,
  total,
  page,
  pageSize,
  isLoading,
  onDelete,
  onPageChange,
}: DataTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pkColumn = columns.find((col) => col.isPrimaryKey);

  const getRowId = (row: Record<string, unknown>): string | number | null => {
    if (!pkColumn) return null;
    const value = row[pkColumn.name];
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }
    return null;
  };

  const toggleRowSelection = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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

  const copyToClipboard = useCallback(async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label ? `已复制: ${label}` : "已复制");
    } catch {
      toast.error("复制失败");
    }
  }, []);

  const copyColumnName = useCallback(
    (columnName: string) => copyToClipboard(columnName, columnName),
    [copyToClipboard]
  );

  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return "NULL";
    }
    if (typeof value === "object") {
      if (value instanceof Date) {
        return value.toLocaleString();
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 justify-center items-center text-neutral-500">
        加载中...
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex flex-1 flex-col justify-center items-center py-20">
        <div className="size-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
          <Table2 className="size-7 text-neutral-400" />
        </div>
        <p className="text-neutral-500 text-pretty">请选择一个数据表</p>
      </div>
    );
  }

  const hasPrimaryKey = !!pkColumn;
  const totalPages = Math.ceil(total / pageSize);
  const startRow = (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, total);

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page > 3) {
        pages.push("ellipsis");
      }
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex justify-between items-center px-5 h-14 border-b border-neutral-100">
        <div className="text-neutral-500 text-sm tabular-nums">
          共 {total} 行
          {total > 0 && `，显示第 ${startRow}-${endRow} 行`}
          {selectedIds.size > 0 && (
            <span className="ml-2 text-neutral-900 font-medium">
              已选择 {selectedIds.size} 行
            </span>
          )}
        </div>
        {hasPrimaryKey && selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="rounded-lg"
            aria-label="删除选中的行"
          >
            <Trash2 className="size-4" />
            {isDeleting ? "删除中..." : `删除 (${selectedIds.size})`}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-neutral-100">
              {hasPrimaryKey && (
                <TableHead className="top-0 z-10 sticky bg-white w-10 px-3">
                  <Checkbox
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="全选"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead key={column.name} className="top-0 z-10 sticky bg-white">
                  <div className="flex items-center gap-1 truncate">
                    <span 
                      className="hover:text-neutral-900 truncate transition-colors cursor-pointer text-neutral-600 font-medium"
                      onClick={() => copyColumnName(column.name)}
                      title="点击复制列名"
                    >
                      {column.name}
                    </span>
                    {column.isPrimaryKey && (
                      <span className="text-xs text-neutral-400 shrink-0">(PK)</span>
                    )}
                  </div>
                  <div className="font-normal text-neutral-400 text-xs truncate">
                    {column.type}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (hasPrimaryKey ? 1 : 0)}
                  className="py-20 text-neutral-500 text-center"
                >
                  <div className="size-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                    <Table2 className="size-7 text-neutral-400" />
                  </div>
                  没有数据
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => {
                const rowId = getRowId(row);
                const isSelected = rowId !== null && selectedIds.has(rowId);

                return (
                  <TableRow
                    key={rowId !== null ? `${rowId}-${index}` : index}
                    data-state={isSelected ? "selected" : undefined}
                    className="border-neutral-100"
                  >
                    {hasPrimaryKey && (
                      <TableCell className="w-10 px-3">
                        {rowId !== null && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRowSelection(rowId)}
                            aria-label={`选择行 ${rowId}`}
                          />
                        )}
                      </TableCell>
                    )}
                    {columns.map((column) => {
                      const formatted = formatCellValue(row[column.name]);
                      return (
                        <TableCell
                          key={column.name}
                          title={formatted}
                          className="hover:bg-neutral-50 transition-colors cursor-pointer text-neutral-600"
                          onClick={() => copyToClipboard(formatted)}
                        >
                          <span
                            className={
                              row[column.name] === null
                                ? "text-neutral-400 italic"
                                : ""
                            }
                          >
                            {formatted}
                          </span>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
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
              确定要删除选中的 {selectedIds.size} 行数据吗？此操作不可撤销。
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
