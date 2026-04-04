"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserBillingSnapshot } from "@/lib/tableman/user-billing-types";
import { Wallet } from "lucide-react";

function formatUsd(micro: number): string {
  return (micro / 1_000_000).toLocaleString("zh-CN", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

interface UserBillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: UserBillingSnapshot | null;
  isLoading: boolean;
}

export function UserBillingDialog({
  open,
  onOpenChange,
  snapshot,
  isLoading,
}: UserBillingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] max-w-lg flex-col gap-4 overflow-hidden sm:max-w-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 text-left">
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-5" />
            计费详情
          </DialogTitle>
          <DialogDescription className="text-left text-neutral-500">
            与 checkLimit / trackUsage 相同口径：Redis 优先，分项回退 usage 表。
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1 text-sm">
          {isLoading && (
            <div className="text-neutral-500 py-12 text-center">加载中…</div>
          )}
          {!isLoading && !snapshot && (
            <div className="text-neutral-500 py-12 text-center">暂无数据</div>
          )}
          {!isLoading && snapshot && (
            <div className="space-y-5 pb-1">
              <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
                  账户与周期
                </div>
                <dl className="space-y-2 text-neutral-800">
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">计费口径</dt>
                    <dd className="font-medium text-right">
                      {snapshot.billingAsPaid ? "付费（订阅周期）" : "免费（按日）"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">订阅状态</dt>
                    <dd className="text-right">
                      {snapshot.subscriptionActive ? "有效" : "未激活 / 已过期"}
                      {snapshot.subscriptionType && (
                        <span className="text-neutral-500 ml-1">
                          （{snapshot.subscriptionType === "subscription" ? "连续订阅" : "一次性"}）
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">周期说明</dt>
                    <dd className="text-right text-xs leading-snug max-w-[220px]">
                      {snapshot.periodLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">用户时区</dt>
                    <dd className="font-mono text-xs text-right">{snapshot.timezone}</dd>
                  </div>
                  {snapshot.subscriptionExpireTime && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-neutral-500">订阅到期</dt>
                      <dd className="text-xs text-right tabular-nums">
                        {formatDateTime(snapshot.subscriptionExpireTime)}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className="rounded-xl border border-neutral-200 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
                  本周期成本
                </div>
                <p className="text-2xl font-semibold tabular-nums text-neutral-900">
                  {formatUsd(snapshot.totalMicro)}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  周期上限 {formatUsd(snapshot.quotaMicro)}（
                  {snapshot.mode === "subscription" ? "订阅 $4 / 周期" : "免费 $0.1 / 日"}
                  ）
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-full rounded-full transition-[width] ${
                      snapshot.totalMicro >= snapshot.quotaMicro
                        ? "bg-red-600"
                        : "bg-neutral-800"
                    }`}
                    style={{
                      width: `${Math.min(100, (snapshot.totalMicro / snapshot.quotaMicro) * 100)}%`,
                    }}
                  />
                </div>
              </section>

              <section className="rounded-xl border border-neutral-200 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
                  重置时间
                </div>
                <p className="font-medium text-neutral-900">
                  {formatDateTime(snapshot.resetAtIso)}
                </p>
                <p className="text-xs text-neutral-500 mt-2 leading-relaxed break-words">
                  {snapshot.resetHint}
                </p>
              </section>

              <section className="rounded-xl border border-neutral-200 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
                  内訳（分项花费）
                </div>
                {(() => {
                  const [o, m, b] = snapshot.breakdownLines;
                  const sumParts = (o?.micro ?? 0) + (m?.micro ?? 0) + (b?.micro ?? 0);
                  const sumOk = sumParts === snapshot.totalMicro;
                  return (
                    <>
                      <p className="font-mono text-xs leading-relaxed break-all text-neutral-900">
                        <span className="text-neutral-500">cost_total_micro</span> ={" "}
                        <span className="text-neutral-500">cost_openai_micro</span> +{" "}
                        <span className="text-neutral-500">cost_minimax_tts_micro</span> +{" "}
                        <span className="text-neutral-500">cost_vercel_blob_micro</span>
                      </p>
                      <p className="font-mono text-sm tabular-nums mt-2 text-neutral-900">
                        {snapshot.totalMicro} = {o?.micro ?? 0} + {m?.micro ?? 0} + {b?.micro ?? 0}{" "}
                        <span className="text-neutral-500 text-xs font-sans">（microUSD）</span>
                      </p>
                      {!sumOk && (
                        <p className="text-xs text-amber-700 mt-1">
                          提示：分项之和与 total 不一致，可能 Redis/DB 不同步。
                        </p>
                      )}
                      <p className="font-mono text-[11px] text-neutral-600 mt-3 break-all leading-relaxed">
                        合计 Redis GET <span className="text-neutral-800">{snapshot.totalRedisKey}</span> →{" "}
                        {snapshot.totalRedisRaw === null
                          ? "（无键）"
                          : `"${snapshot.totalRedisRaw}"`}{" "}
                        ；采用 {snapshot.totalValueSource === "redis" ? "Redis" : "DB"} →{" "}
                        {snapshot.totalMicro} microUSD
                        {snapshot.totalDbStoredMicro !== null && (
                          <>
                            {" "}
                            · DB <span className="text-neutral-800">usage.{snapshot.totalDbColumn}</span>{" "}
                            = {snapshot.totalDbStoredMicro}
                          </>
                        )}
                      </p>

                      <div className="mt-4 space-y-4 border-t border-neutral-100 pt-4">
                        {snapshot.breakdownLines.map((line) => (
                          <div key={line.id} className="text-xs space-y-1.5">
                            <p className="font-medium text-neutral-800">{line.label}</p>
                            <p className="font-mono text-[11px] text-neutral-600 break-all leading-relaxed">
                              Redis GET <span className="text-neutral-800">{line.redisKey}</span> →{" "}
                              {line.redisRaw === null ? "（无键）" : `"${line.redisRaw}"`}{" "}
                              ；采用 {line.valueSource === "redis" ? "Redis" : "DB"} →{" "}
                              <span className="tabular-nums text-neutral-900">{line.micro}</span> microUSD
                            </p>
                            <p className="font-mono text-[11px] text-neutral-600 break-all">
                              DB 列{" "}
                              <span className="text-neutral-800">usage.{line.dbColumn}</span>
                              {line.dbStoredMicro !== null
                                ? ` = ${line.dbStoredMicro}`
                                : "（当前周期无行或为空）"}
                            </p>
                            <p className="text-neutral-600 leading-relaxed pl-0">
                              系数：{line.coefficientText}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </section>

              <section className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
                  如何计算（系统口径）
                </div>
                <ul className="list-disc space-y-2 pl-4 text-xs text-neutral-600 leading-relaxed">
                  {snapshot.methodology.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
