"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BuildsFilterProps {
  statusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
}

const STATUS_OPTIONS = [
  { value: null, label: "全部" },
  { value: "completed", label: "已完成" },
  { value: "in_progress", label: "进行中" },
  { value: "queued", label: "排队中" },
];

export function BuildsFilter({
  statusFilter,
  onStatusFilterChange,
}: BuildsFilterProps) {
  return (
    <div className="flex items-center gap-2 px-5 py-3 border-b border-neutral-100">
      <span className="text-sm text-neutral-500 mr-2">状态筛选：</span>
      {STATUS_OPTIONS.map((option) => (
        <Button
          key={option.value ?? "all"}
          variant="ghost"
          size="sm"
          onClick={() => onStatusFilterChange(option.value)}
          className={cn(
            "rounded-lg h-8 px-3 text-sm",
            statusFilter === option.value
              ? "bg-neutral-900 text-white hover:bg-neutral-800 hover:text-white"
              : "text-neutral-600 hover:bg-neutral-100"
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
