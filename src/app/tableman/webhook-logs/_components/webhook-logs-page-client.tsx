"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Webhook, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WebhookLogsTable } from "./webhook-logs-table";
import { WebhookLogsFilter } from "./webhook-logs-filter";
import type { WebhookLogsResponse } from "@/app/api/tableman/webhook-logs/route";
import type { WebhookLogEntry } from "@/lib/webhook-log";

const PAGE_SIZE = 20;

export function WebhookLogsPageClient() {
  const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [userIdFilter, setUserIdFilter] = useState("");
  const [debouncedUserId, setDebouncedUserId] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserId(userIdFilter);
    }, 500);
    return () => clearTimeout(timer);
  }, [userIdFilter]);

  const fetchLogs = useCallback(async (currentPage: number, branch: string | null, userId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: String(PAGE_SIZE),
      });

      if (branch) {
        params.set("branch", branch);
      }

      if (userId) {
        params.set("userId", userId);
      }

      const response = await fetch(`/api/tableman/webhook-logs?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "获取 Webhook 日志失败");
      }

      const data: WebhookLogsResponse = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : "获取 Webhook 日志失败";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page, branchFilter, debouncedUserId);
  }, [fetchLogs, page, branchFilter, debouncedUserId]);

  const handleRefresh = () => {
    fetchLogs(page, branchFilter, debouncedUserId);
    toast.success("已刷新");
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleBranchFilterChange = (branch: string | null) => {
    setBranchFilter(branch);
    setPage(1);
  };

  const handleUserIdFilterChange = (userId: string) => {
    setUserIdFilter(userId);
    setPage(1);
  };

  return (
    <div className="flex flex-col p-6 lg:p-8 h-full">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex justify-center items-center bg-neutral-900 rounded-xl size-10">
              <Webhook className="size-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-neutral-900 text-2xl text-balance">
                Webhook 日志
              </h1>
              <p className="mt-0.5 text-neutral-500 text-sm text-pretty">
                查看 Stripe Webhook 执行记录，追踪订阅处理流程
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="rounded-lg"
          >
            <RefreshCw className={`size-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 mb-4 p-4 rounded-xl text-red-600 text-pretty">
          {error}
        </div>
      )}

      <div className="flex flex-col flex-1 bg-white border border-neutral-200 rounded-2xl min-h-0 overflow-hidden">
        <WebhookLogsFilter
          branchFilter={branchFilter}
          onBranchFilterChange={handleBranchFilterChange}
          userIdFilter={userIdFilter}
          onUserIdFilterChange={handleUserIdFilterChange}
        />
        <WebhookLogsTable
          logs={logs}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          isLoading={isLoading}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
