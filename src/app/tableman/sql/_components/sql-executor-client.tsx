"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Play, Loader2, Copy, Check, Download, Sparkles } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc, safeTrpc } from "@/lib/trpc-client";
import { ERROR_CODES } from "@/server/constants";

interface QueryResult {
  success: boolean;
  rows: Record<string, unknown>[];
  rowCount: number;
  fields: { name: string }[];
  duration: number;
  command: string;
}

function formatCellValue(value: unknown) {
  if (value == null) {
    return "NULL";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

const PRESET_QUERIES = [
  {
    name: "无 word_segmentation 的卡片",
    sql: `SELECT id, original_text, create_time, user_id
FROM memo_card
WHERE word_segmentation IS NULL 
   OR word_segmentation = 'null'::jsonb
ORDER BY create_time DESC
LIMIT 100;`,
  },
  {
    name: "用户订阅统计",
    sql: `SELECT subscription_type, COUNT(*) as count
FROM user_subscription
GROUP BY subscription_type;`,
  },
  {
    name: "最近注册用户",
    sql: `SELECT id, email, name, created_at
FROM "user"
ORDER BY created_at DESC
LIMIT 20;`,
  },
  {
    name: "各表行数",
    sql: `SELECT relname as table_name, n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;`,
  },
];

export function SqlExecutorClient() {
  const [prompt, setPrompt] = useState("");
  const [sql, setSql] = useState("");
  const [executing, setExecuting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [resultCopied, setResultCopied] = useState(false);

  const execute = useCallback(async () => {
    if (!sql.trim()) return;
    setExecuting(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/tableman/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError("网络错误");
    } finally {
      setExecuting(false);
    }
  }, [sql]);

  const generateSql = useCallback(async () => {
    if (!prompt.trim()) return;

    setGenerating(true);
    setPromptError(null);
    setAiExplanation(null);

    const response = await safeTrpc(() =>
      trpc.ai.textToSql.mutate({
        prompt: prompt.trim(),
      })
    );

    if (!response.ok) {
      setPromptError(response.error.message || "生成 SQL 失败");
      setGenerating(false);
      return;
    }

    if (response.data.errorCode !== null) {
      switch (response.data.errorCode) {
        case ERROR_CODES.TEXT_TO_SQL_PARSE_FAILED:
          setPromptError("AI 返回内容解析失败，请重试");
          break;
        case ERROR_CODES.TEXT_TO_SQL_SQL_MISSING:
          setPromptError("AI 没有生成有效 SQL，请重试");
          break;
        case ERROR_CODES.TOKEN_LIMIT_EXCEEDED:
          setPromptError("AI 调用额度不足");
          break;
        default:
          setPromptError("生成 SQL 失败");
      }
      setGenerating(false);
      return;
    }

    setSql(response.data.sql);
    setAiExplanation(response.data.explanation);
    setResult(null);
    setError(null);
    setGenerating(false);
  }, [prompt]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      execute();
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(JSON.stringify(result.rows, null, 2));
    setResultCopied(true);
    setTimeout(() => setResultCopied(false), 2000);
  };

  const copyCellValue = useCallback(async (value: unknown) => {
    try {
      await navigator.clipboard.writeText(formatCellValue(value));
      toast.success("已复制单元格内容");
    } catch {
      toast.error("复制失败");
    }
  }, []);

  const downloadCsv = () => {
    if (!result?.rows.length) return;
    const headers = result.fields.map((f) => f.name);
    const csv = [
      headers.join(","),
      ...result.rows.map((row) =>
        headers.map((h) => {
          const v = row[h];
          if (v == null) return "";
          const s = typeof v === "object" ? JSON.stringify(v) : String(v);
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        }).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sql-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="font-bold text-black text-2xl text-balance">SQL</h1>

      <div className="space-y-3 bg-white p-4 border border-neutral-200 rounded-lg">
        <div className="space-y-1">
          <h2 className="font-semibold text-black text-base text-balance">文本转 SQL</h2>
          <p className="text-black text-sm text-pretty">
            输入需求，AI 会基于当前数据库的 public schema 生成一条 PostgreSQL SQL。
          </p>
        </div>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="比如：查询最近 30 天注册的管理员用户，按创建时间倒序"
          className="bg-white border-neutral-300 min-h-[120px] text-black placeholder:text-neutral-400 text-sm"
        />

        <div className="flex justify-between items-center gap-3">
          <div className="min-h-5 text-black text-sm text-pretty">
            {promptError ? (
              <span className="text-red-600">{promptError}</span>
            ) : aiExplanation ? (
              <span>{aiExplanation}</span>
            ) : null}
          </div>

          <Button
            onClick={generateSql}
            disabled={generating || !prompt.trim()}
            className="bg-black hover:bg-neutral-800 text-white"
          >
            {generating ? (
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 w-4 h-4" />
            )}
            生成 SQL
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESET_QUERIES.map((p) => (
          <Button
            key={p.name}
            variant="outline"
            size="sm"
            onClick={() => { setSql(p.sql); setResult(null); setError(null); }}
            className="bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-white hover:text-white"
          >
            {p.name}
          </Button>
        ))}
      </div>

      <Textarea
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="SQL... (⌘+Enter 执行)"
        className="bg-white border-neutral-300 min-h-[180px] font-mono text-black placeholder:text-neutral-400 text-sm"
      />

      <div className="flex justify-between items-center">
        <span className="text-neutral-500 text-xs">⌘+Enter 执行</span>
        <Button onClick={execute} disabled={executing || !sql.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
          {executing ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Play className="mr-2 w-4 h-4" />}
          执行
        </Button>
      </div>

      {error && (
        <pre className="bg-red-50 p-4 border border-red-200 rounded overflow-x-auto text-red-600 text-sm">
          {error}
        </pre>
      )}

      {result && (
        <div className="space-y-2">
          <div className="flex justify-between items-center tabular-nums text-neutral-600 text-sm">
            <span>
              {result.command} | {result.rowCount} 行 | {result.duration}ms
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copy}
                aria-label="复制结果 JSON"
                className="bg-white hover:bg-neutral-50 border-neutral-300 text-black hover:text-black"
              >
                {resultCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadCsv}
                aria-label="下载结果 CSV"
                className="bg-white hover:bg-neutral-50 border-neutral-300 text-black hover:text-black"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {result.rows.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-lg max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="top-0 sticky bg-neutral-900">
                  <TableRow className="hover:bg-transparent border-neutral-800">
                    <TableHead className="w-10 text-white">#</TableHead>
                    {result.fields.map((f) => (
                      <TableHead key={f.name} className="text-white whitespace-nowrap">
                        {f.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row, i) => (
                    <TableRow key={i} className="hover:bg-neutral-50 border-neutral-200">
                      <TableCell className="font-mono text-neutral-500 text-xs">{i + 1}</TableCell>
                      {result.fields.map((f) => {
                        const value = row[f.name];
                        const formattedValue = formatCellValue(value);

                        return (
                          <TableCell
                            key={f.name}
                            className="max-w-[300px] font-mono text-black text-sm truncate cursor-pointer"
                            title={formattedValue}
                            onClick={() => copyCellValue(value)}
                          >
                            {formattedValue}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
