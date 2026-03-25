"use client";

import { useCallback, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Webhook,
  CreditCard,
  RefreshCw,
  SkipForward,
  AlertTriangle,
  HelpCircle,
  Eye,
} from "lucide-react";
import type { WebhookLogEntry } from "@/lib/webhook-log";

interface WebhookLogsTableProps {
  logs: WebhookLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

function BranchBadge({ branch, success }: { branch: string; success: boolean }) {
  if (!success) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-sm font-medium">
        <XCircle className="size-3.5" />
        错误
      </span>
    );
  }

  switch (branch) {
    case "one_time_payment":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-600 text-sm font-medium">
          <CreditCard className="size-3.5" />
          一次性支付
        </span>
      );
    case "subscription":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium">
          <RefreshCw className="size-3.5" />
          订阅
        </span>
      );
    case "subscription_checkout_skip":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 text-sm font-medium">
          <Clock className="size-3.5" />
          订阅等待
        </span>
      );
    case "skipped":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-500 text-sm font-medium">
          <SkipForward className="size-3.5" />
          跳过
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-sm font-medium">
          <AlertTriangle className="size-3.5" />
          错误
        </span>
      );
    case "unhandled":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-400 text-sm font-medium">
          <HelpCircle className="size-3.5" />
          未处理
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-500 text-sm font-medium">
          {branch}
        </span>
      );
  }
}

function SuccessBadge({ success }: { success: boolean }) {
  if (success) {
    return (
      <span className="inline-flex items-center gap-1 text-green-600">
        <CheckCircle2 className="size-4" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-red-600">
      <XCircle className="size-4" />
    </span>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatEventType(eventType: string): string {
  const mapping: Record<string, string> = {
    "checkout.session.completed": "Checkout 完成",
    "invoice.payment_succeeded": "Invoice 支付成功",
  };
  return mapping[eventType] || eventType;
}

export function WebhookLogsTable({
  logs,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
}: WebhookLogsTableProps) {
  const [selectedLog, setSelectedLog] = useState<WebhookLogEntry | null>(null);

  const copyToClipboard = useCallback(async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label ? `已复制: ${label}` : "已复制");
    } catch {
      toast.error("复制失败");
    }
  }, []);

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex flex-1 justify-center items-center text-neutral-500">
        <Loader2 className="size-5 animate-spin mr-2" />
        加载中...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-1 flex-col justify-center items-center py-20">
        <div className="size-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
          <Webhook className="size-7 text-neutral-400" />
        </div>
        <p className="text-neutral-500 text-pretty">暂无 Webhook 日志</p>
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
              <TableHead className="sticky top-0 z-10 bg-white w-16">状态</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white">处理分支</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white">事件类型</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white">用户 ID</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white">Stripe 客户</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white">时间</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white w-16">详情</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="border-neutral-100">
                <TableCell>
                  <SuccessBadge success={log.success} />
                </TableCell>
                <TableCell>
                  <BranchBadge branch={log.processingBranch} success={log.success} />
                </TableCell>
                <TableCell>
                  <span className="text-sm text-neutral-600">
                    {formatEventType(log.eventType)}
                  </span>
                </TableCell>
                <TableCell>
                  {log.userId ? (
                    <span
                      className="font-mono text-sm cursor-pointer hover:text-neutral-900 transition-colors"
                      onClick={() => copyToClipboard(log.userId!, log.userId!.slice(0, 8))}
                      title={`点击复制: ${log.userId}`}
                    >
                      {log.userId.slice(0, 8)}...
                    </span>
                  ) : (
                    <span className="text-sm text-neutral-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {log.stripeCustomerEmail ? (
                    <span
                      className="text-sm text-neutral-600 cursor-pointer hover:text-neutral-900 transition-colors"
                      onClick={() => copyToClipboard(log.stripeCustomerEmail!)}
                      title={`点击复制: ${log.stripeCustomerEmail}`}
                    >
                      {log.stripeCustomerEmail}
                    </span>
                  ) : log.stripeCustomerId ? (
                    <span
                      className="font-mono text-sm text-neutral-500 cursor-pointer hover:text-neutral-900 transition-colors"
                      onClick={() => copyToClipboard(log.stripeCustomerId!)}
                      title={`点击复制: ${log.stripeCustomerId}`}
                    >
                      {log.stripeCustomerId.slice(0, 12)}...
                    </span>
                  ) : (
                    <span className="text-sm text-neutral-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-neutral-600 tabular-nums">
                    {formatDate(log.createdAt)}
                  </span>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-neutral-100 transition-colors"
                    title="查看详情"
                  >
                    <Eye className="size-4 text-neutral-500" />
                  </button>
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

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Webhook 日志详情</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutral-500">日志 ID</span>
                  <p className="font-mono mt-1">{selectedLog.id}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Stripe 事件 ID</span>
                  <p className="font-mono mt-1">{selectedLog.stripeEventId}</p>
                </div>
                <div>
                  <span className="text-neutral-500">事件类型</span>
                  <p className="mt-1">{selectedLog.eventType}</p>
                </div>
                <div>
                  <span className="text-neutral-500">处理分支</span>
                  <p className="mt-1">
                    <BranchBadge branch={selectedLog.processingBranch} success={selectedLog.success} />
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">用户 ID</span>
                  <p className="font-mono mt-1">{selectedLog.userId || "-"}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Stripe 客户 ID</span>
                  <p className="font-mono mt-1">{selectedLog.stripeCustomerId || "-"}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Stripe 客户邮箱</span>
                  <p className="mt-1">{selectedLog.stripeCustomerEmail || "-"}</p>
                </div>
                <div>
                  <span className="text-neutral-500">订阅记录 ID</span>
                  <p className="font-mono mt-1">{selectedLog.subscriptionId || "-"}</p>
                </div>
                <div>
                  <span className="text-neutral-500">处理状态</span>
                  <p className="mt-1">
                    {selectedLog.success ? (
                      <span className="text-green-600">成功</span>
                    ) : (
                      <span className="text-red-600">失败</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">时间</span>
                  <p className="mt-1">{new Date(selectedLog.createdAt).toLocaleString("zh-CN")}</p>
                </div>
              </div>
              {selectedLog.errorMessage && (
                <div>
                  <span className="text-neutral-500 text-sm">错误信息</span>
                  <p className="mt-1 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {selectedLog.errorMessage}
                  </p>
                </div>
              )}
              {selectedLog.payload && (
                <div>
                  <span className="text-neutral-500 text-sm">Payload</span>
                  <pre className="mt-1 p-3 bg-neutral-50 rounded-lg text-sm overflow-auto">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
