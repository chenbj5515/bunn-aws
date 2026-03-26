"use client";

import { useState } from "react";
import {
  Pencil,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Save,
  X,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface RedisKeysPanelProps {
  keys: RedisKeyEntry[];
  userId: string;
  isLoading: boolean;
  onRefresh: () => void;
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

function getTypeVariant(type: string): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "string":
      return "default";
    case "hash":
      return "secondary";
    default:
      return "outline";
  }
}

function getKeyCategory(key: string): string {
  if (key.includes(":subscription:")) return "订阅";
  if (key.includes(":settings")) return "设置";
  if (key.includes(":safari:")) return "Safari";
  if (key.includes("token:")) return "Token";
  if (key.includes("random-cards:")) return "随机卡片";
  if (key.includes("review:")) return "复习";
  if (key.includes("webhook:")) return "Webhook";
  if (key.includes("active-sessions")) return "会话";
  return "其他";
}

function getKeyShortName(key: string, userId: string): string {
  return key
    .replace(`user:${userId}:`, "")
    .replace(`token:${userId}:`, "token/")
    .replace(`random-cards:${userId}:`, "random-cards/")
    .replace(`review:${userId}:`, "review/")
    .replace(`webhook:user:${userId}:`, "webhook/")
    .replace(`active-sessions-${userId}`, "active-sessions");
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

function RedisKeyCard({
  entry,
  userId,
  onEdit,
  onDelete,
}: {
  entry: RedisKeyEntry;
  userId: string;
  onEdit: (entry: RedisKeyEntry) => void;
  onDelete: (key: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedValue, setCopiedValue] = useState(false);

  const shortName = getKeyShortName(entry.key, userId);
  const category = getKeyCategory(entry.key);
  const formattedValue = tryFormatJson(entry.value);

  const handleCopyKey = async () => {
    await navigator.clipboard.writeText(entry.key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyValue = async () => {
    if (!entry.value) return;
    await navigator.clipboard.writeText(entry.value);
    setCopiedValue(true);
    setTimeout(() => setCopiedValue(false), 2000);
  };

  return (
    <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden">
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-neutral-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="mt-0.5 text-neutral-400 hover:text-neutral-600 shrink-0">
          {isExpanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-neutral-900 break-all">
              {shortName}
            </span>
            <Badge variant="outline" className="text-xs shrink-0">
              {category}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500">
            <Badge variant={getTypeVariant(entry.type)} className="text-xs">
              {entry.type}
            </Badge>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatTTL(entry.ttl)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleCopyKey}
            title="复制 Key"
          >
            {copiedKey ? (
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
              onClick={() => onEdit(entry)}
              title="编辑"
            >
              <Pencil className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(entry.key)}
            title="删除"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-neutral-100 bg-neutral-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              完整 Key
            </span>
          </div>
          <code className="block text-xs font-mono text-neutral-700 bg-white p-2 rounded border border-neutral-200 break-all mb-4">
            {entry.key}
          </code>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              值
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleCopyValue}
              disabled={!entry.value}
            >
              {copiedValue ? (
                <>
                  <Check className="size-3 mr-1 text-green-600" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="size-3 mr-1" />
                  复制
                </>
              )}
            </Button>
          </div>
          <pre className="text-xs font-mono text-neutral-700 bg-white p-3 rounded border border-neutral-200 overflow-auto max-h-64 whitespace-pre-wrap break-all">
            {formattedValue || <span className="text-neutral-400">null</span>}
          </pre>
        </div>
      )}
    </div>
  );
}

export function RedisKeysPanel({
  keys,
  userId,
  isLoading,
  onRefresh,
  onUpdate,
  onDelete,
}: RedisKeysPanelProps) {
  const [editingEntry, setEditingEntry] = useState<RedisKeyEntry | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editTTL, setEditTTL] = useState("");
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (entry: RedisKeyEntry) => {
    setEditingEntry(entry);
    setEditValue(tryFormatJson(entry.value));
    setEditTTL(entry.ttl > 0 ? String(entry.ttl) : "");
  };

  const handleSave = async () => {
    if (!editingEntry) return;
    setIsSaving(true);
    try {
      const ttl = editTTL ? parseInt(editTTL, 10) : -1;
      await onUpdate(editingEntry.key, editValue, ttl);
      setEditingEntry(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteKey) return;
    await onDelete(deleteKey);
    setDeleteKey(null);
  };

  const groupedKeys = keys.reduce((acc, key) => {
    const category = getKeyCategory(key.key);
    if (!acc[category]) acc[category] = [];
    acc[category].push(key);
    return acc;
  }, {} as Record<string, RedisKeyEntry[]>);

  const categoryOrder = ["设置", "订阅", "Token", "Safari", "复习", "随机卡片", "Webhook", "会话", "其他"];
  const sortedCategories = Object.keys(groupedKeys).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
        <RefreshCw className="size-8 animate-spin mb-2" />
        <span>加载中...</span>
      </div>
    );
  }

  if (keys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
        <p className="text-lg">该用户暂无缓存数据</p>
        <p className="text-sm mt-1">Redis 中没有找到与此用户相关的 key</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onRefresh}>
          <RefreshCw className="size-4 mr-1.5" />
          刷新
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="text-sm text-neutral-600">
          共 <span className="font-medium text-neutral-900">{keys.length}</span> 个缓存项
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="h-8">
          <RefreshCw className="size-3.5 mr-1.5" />
          刷新
        </Button>
      </div>

      <div className="flex-1 overflow-auto space-y-6 pr-2">
        {sortedCategories.map((category) => (
          <div key={category}>
            <h3 className="text-sm font-medium text-neutral-500 mb-3 flex items-center gap-2">
              {category}
              <span className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">
                {groupedKeys[category].length}
              </span>
            </h3>
            <div className="space-y-2">
              {groupedKeys[category].map((entry) => (
                <RedisKeyCard
                  key={entry.key}
                  entry={entry}
                  userId={userId}
                  onEdit={handleEdit}
                  onDelete={setDeleteKey}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑缓存值</DialogTitle>
            <DialogDescription className="break-all">
              <code className="font-mono text-sm bg-neutral-100 px-2 py-0.5 rounded">
                {editingEntry?.key}
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
            <Button variant="outline" onClick={() => setEditingEntry(null)}>
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
              确定要删除此缓存吗？此操作无法撤销。
              <br />
              <code className="font-mono text-sm bg-neutral-100 px-2 py-0.5 rounded mt-2 inline-block break-all">
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
    </div>
  );
}
