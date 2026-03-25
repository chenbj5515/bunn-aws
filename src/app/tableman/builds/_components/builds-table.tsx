"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  Rocket,
  GitBranch,
  Timer,
  Ban,
} from "lucide-react";
import type { BuildRecord } from "@/app/api/tableman/builds/route";

interface BuildsTableProps {
  builds: BuildRecord[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

function StatusBadge({ build }: { build: BuildRecord }) {
  if (build.status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium">
        <Loader2 className="size-3.5 animate-spin" />
        运行中
      </span>
    );
  }

  if (build.status === "queued" || build.status === "waiting") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 text-sm font-medium">
        <Clock className="size-3.5" />
        等待中
      </span>
    );
  }

  if (build.conclusion === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-600 text-sm font-medium">
        <CheckCircle2 className="size-3.5" />
        成功
      </span>
    );
  }

  if (build.conclusion === "failure") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-sm font-medium">
        <XCircle className="size-3.5" />
        失败
      </span>
    );
  }

  if (build.conclusion === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-500 text-sm font-medium">
        <Ban className="size-3.5" />
        已取消
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-500 text-sm font-medium">
      <Clock className="size-3.5" />
      {build.conclusion || build.status}
    </span>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BuildsTable({
  builds,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
}: BuildsTableProps) {
  const copyToClipboard = useCallback(async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label ? `已复制: ${label}` : "已复制");
    } catch {
      toast.error("复制失败");
    }
  }, []);

  if (isLoading && builds.length === 0) {
    return (
      <div className="flex flex-1 justify-center items-center text-neutral-500">
        <Loader2 className="size-5 animate-spin mr-2" />
        加载中...
      </div>
    );
  }

  if (builds.length === 0) {
    return (
      <div className="flex flex-1 flex-col justify-center items-center py-20">
        <div className="size-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
          <Rocket className="size-7 text-neutral-400" />
        </div>
        <p className="text-neutral-500 text-pretty">暂无构建记录</p>
      </div>
    );
  }

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
          共 {total} 条记录
          {total > 0 && `，显示第 ${startRow}-${endRow} 条`}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-neutral-100">
              <TableHead className="sticky top-0 z-10 bg-white w-28">状态</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white">Commit</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white">镜像标签</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white">分支</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white">触发者</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white">开始时间</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white">耗时</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white w-16">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {builds.map((build) => (
              <TableRow key={build.id} className="border-neutral-100">
                <TableCell>
                  <StatusBadge build={build} />
                </TableCell>
                <TableCell>
                  <span
                    className="font-mono text-sm cursor-pointer hover:text-neutral-900 transition-colors"
                    onClick={() => copyToClipboard(build.commitSha, build.commitShort)}
                    title={`点击复制完整 SHA: ${build.commitSha}`}
                  >
                    {build.commitShort}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className="font-mono text-sm text-neutral-500 cursor-pointer hover:text-neutral-900 transition-colors"
                    onClick={() => copyToClipboard(build.imageTag)}
                    title="点击复制镜像标签"
                  >
                    {build.imageTag}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-sm text-neutral-600">
                    <GitBranch className="size-3.5" />
                    {build.branch}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {build.actor.avatarUrl && (
                      <img
                        src={build.actor.avatarUrl}
                        alt={build.actor.login}
                        className="size-6 rounded-full"
                      />
                    )}
                    <span className="text-sm text-neutral-600">{build.actor.login}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-neutral-600 tabular-nums">
                    {formatDate(build.startedAt)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-sm text-neutral-500 tabular-nums">
                    <Timer className="size-3.5" />
                    {build.durationFormatted}
                  </span>
                </TableCell>
                <TableCell>
                  <a
                    href={build.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-neutral-100 transition-colors"
                    title="在 GitHub 查看"
                  >
                    <ExternalLink className="size-4 text-neutral-500" />
                  </a>
                </TableCell>
              </TableRow>
            ))}
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
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(page + 1)}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
