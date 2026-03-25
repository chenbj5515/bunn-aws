"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Rocket, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuildsTable } from "./builds-table";
import { BuildsFilter } from "./builds-filter";
import type { BuildRecord, BuildsResponse } from "@/app/api/tableman/builds/route";

const PAGE_SIZE = 20;

export function BuildsPageClient() {
  const [builds, setBuilds] = useState<BuildRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const fetchBuilds = useCallback(async (currentPage: number, status: string | null) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: String(PAGE_SIZE),
      });

      if (status) {
        params.set("status", status);
      }

      const response = await fetch(`/api/tableman/builds?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "获取构建记录失败");
      }

      const data: BuildsResponse = await response.json();
      setBuilds(data.builds);
      setTotal(data.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : "获取构建记录失败";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuilds(page, statusFilter);
  }, [fetchBuilds, page, statusFilter]);

  const handleRefresh = () => {
    fetchBuilds(page, statusFilter);
    toast.success("已刷新");
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleStatusFilterChange = (status: string | null) => {
    setStatusFilter(status);
    setPage(1);
  };

  return (
    <div className="flex flex-col p-6 lg:p-8 h-full">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex justify-center items-center bg-neutral-900 rounded-xl size-10">
              <Rocket className="size-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-neutral-900 text-2xl text-balance">
                构建记录
              </h1>
              <p className="mt-0.5 text-neutral-500 text-sm text-pretty">
                查看 GitHub Actions 构建和部署历史
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
        <BuildsFilter
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
        />
        <BuildsTable
          builds={builds}
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
