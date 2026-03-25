"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { KeyRound, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RedisKeysTable } from "./redis-keys-table";
import type { RedisKeysResponse, RedisKeyEntry } from "@/app/api/tableman/redis-keys/route";
import type { UserOption } from "../page";

const DEFAULT_USER_ID = "f94bdAbS6nNQTkQiEHvkOkYgxZHdSX1Q";

interface RedisKeysPageClientProps {
  users: UserOption[];
}

export function RedisKeysPageClient({ users }: RedisKeysPageClientProps) {
  const [keys, setKeys] = useState<RedisKeyEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState(DEFAULT_USER_ID);
  const [currentUserId, setCurrentUserId] = useState("");

  const fetchKeys = useCallback(async (userId: string) => {
    if (!userId.trim()) {
      toast.error("请选择用户");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ userId });
      const response = await fetch(`/api/tableman/redis-keys?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "获取 Redis Keys 失败");
      }

      const data: RedisKeysResponse = await response.json();
      setKeys(data.keys);
      setTotal(data.total);
      setCurrentUserId(userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "获取 Redis Keys 失败";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchKeys(selectedUserId);
    }
  }, [selectedUserId, fetchKeys]);

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleRefresh = () => {
    if (currentUserId) {
      fetchKeys(currentUserId);
      toast.success("已刷新");
    }
  };

  const handleUpdate = async (key: string, value: string, ttl?: number) => {
    try {
      const response = await fetch("/api/tableman/redis-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, ttl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "更新失败");
      }

      toast.success("更新成功");
      fetchKeys(currentUserId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "更新失败";
      toast.error(message);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      const params = new URLSearchParams({ key });
      const response = await fetch(`/api/tableman/redis-keys?${params.toString()}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "删除失败");
      }

      toast.success("删除成功");
      fetchKeys(currentUserId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "删除失败";
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col p-6 lg:p-8 h-full">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex justify-center items-center bg-neutral-900 rounded-xl size-10">
              <KeyRound className="size-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-neutral-900 text-2xl text-balance">
                Redis Keys
              </h1>
              <p className="mt-0.5 text-neutral-500 text-sm text-pretty">
                查看和管理用户的 Redis 缓存数据
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || !currentUserId}
            className="rounded-lg"
          >
            <RefreshCw className={`size-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Select value={selectedUserId} onValueChange={handleUserChange}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="选择用户" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <span className="mr-2 font-mono text-neutral-500 text-xs">
                  {user.id.slice(0, 8)}...
                </span>
                <span>{user.email}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="bg-red-50 mb-4 p-4 rounded-xl text-red-600 text-pretty">
          {error}
        </div>
      )}

      {currentUserId && (
        <div className="mb-4 text-neutral-600 text-sm">
          当前用户: <span className="bg-neutral-100 px-2 py-0.5 rounded font-mono">{currentUserId}</span>
          <span className="ml-2 text-neutral-400">共 {total} 个 key</span>
        </div>
      )}

      <div className="flex flex-col flex-1 bg-white border border-neutral-200 rounded-2xl min-h-0 overflow-hidden">
        <RedisKeysTable
          keys={keys}
          isLoading={isLoading}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
