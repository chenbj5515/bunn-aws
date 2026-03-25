"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface WebhookLogsFilterProps {
  branchFilter: string | null;
  onBranchFilterChange: (branch: string | null) => void;
  userIdFilter: string;
  onUserIdFilterChange: (userId: string) => void;
}

const BRANCH_OPTIONS = [
  { value: null, label: "全部" },
  { value: "one_time_payment", label: "一次性支付" },
  { value: "subscription", label: "订阅" },
  { value: "subscription_checkout_skip", label: "订阅等待" },
  { value: "skipped", label: "跳过" },
  { value: "error", label: "错误" },
  { value: "unhandled", label: "未处理" },
];

export function WebhookLogsFilter({
  branchFilter,
  onBranchFilterChange,
  userIdFilter,
  onUserIdFilterChange,
}: WebhookLogsFilterProps) {
  return (
    <div className="flex flex-col gap-3 px-5 py-3 border-b border-neutral-100">
      <div className="flex items-center gap-2">
        <span className="text-sm text-neutral-500 mr-2 shrink-0">处理分支：</span>
        <div className="flex flex-wrap items-center gap-2">
          {BRANCH_OPTIONS.map((option) => (
            <Button
              key={option.value ?? "all"}
              variant="ghost"
              size="sm"
              onClick={() => onBranchFilterChange(option.value)}
              className={cn(
                "rounded-lg h-8 px-3 text-sm",
                branchFilter === option.value
                  ? "bg-neutral-900 text-white hover:bg-neutral-800 hover:text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-neutral-500 mr-2 shrink-0">用户筛选：</span>
        <Input
          placeholder="输入用户 ID"
          value={userIdFilter}
          onChange={(e) => onUserIdFilterChange(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>
    </div>
  );
}
