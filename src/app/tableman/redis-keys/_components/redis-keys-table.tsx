"use client";

import { useState } from "react";
import { Pencil, Trash2, Clock, Eye, EyeOff, Save, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { RedisKeyEntry } from "@/app/api/tableman/redis-keys/route";

interface RedisKeysTableProps {
  keys: RedisKeyEntry[];
  isLoading: boolean;
  onUpdate: (key: string, value: string, ttl?: number) => Promise<void>;
  onDelete: (key: string) => Promise<void>;
}

function formatTTL(ttl: number): string {
  if (ttl === -1) return "永久";
  if (ttl === -2) return "已过期";
  if (ttl < 60) return `${ttl}秒`;
  if (ttl < 3600) return `${Math.floor(ttl / 60)}分钟`;
  if (ttl < 86400) return `${Math.floor(ttl / 3600)}小时`;
  return `${Math.floor(ttl / 86400)}天`;
}

function getTypeColor(type: string): string {
  switch (type) {
    case "string":
      return "bg-blue-100 text-blue-700";
    case "hash":
      return "bg-purple-100 text-purple-700";
    case "list":
      return "bg-green-100 text-green-700";
    case "set":
      return "bg-yellow-100 text-yellow-700";
    case "zset":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

function tryFormatJson(value: string | null): string {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

export function RedisKeysTable({
  keys,
  isLoading,
  onUpdate,
  onDelete,
}: RedisKeysTableProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editTTL, setEditTTL] = useState<string>("");
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleEdit = (entry: RedisKeyEntry) => {
    setEditingKey(entry.key);
    setEditValue(tryFormatJson(entry.value));
    setEditTTL(entry.ttl > 0 ? String(entry.ttl) : "");
  };

  const handleSave = async () => {
    if (!editingKey) return;
    setIsSaving(true);
    try {
      const ttl = editTTL ? parseInt(editTTL, 10) : -1;
      await onUpdate(editingKey, editValue, ttl);
      setEditingKey(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async (key: string, value: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteKey) return;
    await onDelete(deleteKey);
    setDeleteKey(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="border-neutral-300 border-t-neutral-900 border-4 rounded-full w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (keys.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-neutral-500">
        <p>未找到 Redis Keys</p>
        <p className="text-sm mt-1">请输入用户 ID 进行搜索</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-auto flex-1">
        <table className="w-full">
          <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600 w-[40%]">
                Key
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600 w-20">
                类型
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600 w-24">
                TTL
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600">
                值
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-neutral-600 w-28">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {keys.map((entry) => {
              const isExpanded = expandedKeys.has(entry.key);
              const formattedValue = tryFormatJson(entry.value);
              const isLongValue = formattedValue.length > 100;

              return (
                <tr
                  key={entry.key}
                  className="border-b border-neutral-100 hover:bg-neutral-50"
                >
                  <td className="px-4 py-3">
                    <code className="text-sm font-mono text-neutral-800 break-all">
                      {entry.key}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(
                        entry.type
                      )}`}
                    >
                      {entry.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-sm text-neutral-600">
                      <Clock className="size-3.5" />
                      {formatTTL(entry.ttl)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <pre
                        className={`text-sm font-mono text-neutral-700 whitespace-pre-wrap break-all ${
                          !isExpanded && isLongValue ? "max-h-20 overflow-hidden" : ""
                        }`}
                      >
                        {formattedValue || <span className="text-neutral-400">null</span>}
                      </pre>
                      {isLongValue && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-6 text-xs"
                          onClick={() => toggleExpand(entry.key)}
                        >
                          {isExpanded ? (
                            <>
                              <EyeOff className="size-3 mr-1" />
                              收起
                            </>
                          ) : (
                            <>
                              <Eye className="size-3 mr-1" />
                              展开
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleCopy(entry.key, entry.value)}
                        title="复制值"
                      >
                        {copiedKey === entry.key ? (
                          <Check className="size-4 text-green-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                      {entry.type === "string" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(entry)}
                          title="编辑"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteKey(entry.key)}
                        title="删除"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editingKey} onOpenChange={(open) => !open && setEditingKey(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑 Redis Key</DialogTitle>
            <DialogDescription>
              <code className="font-mono text-sm bg-neutral-100 px-2 py-0.5 rounded">
                {editingKey}
              </code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
                值
              </label>
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
                placeholder="输入值..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
                TTL（秒，留空表示永久）
              </label>
              <Input
                type="number"
                value={editTTL}
                onChange={(e) => setEditTTL(e.target.value)}
                placeholder="留空表示永久"
                className="w-40"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingKey(null)}>
              <X className="size-4 mr-1.5" />
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="size-4 mr-1.5" />
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteKey} onOpenChange={(open) => !open && setDeleteKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除此 key 吗？此操作无法撤销。
              <br />
              <code className="font-mono text-sm bg-neutral-100 px-2 py-0.5 rounded mt-2 inline-block">
                {deleteKey}
              </code>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
