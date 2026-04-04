import { redis } from '@/lib/redis';
import { db } from '@/lib/db';
import { getUserSettings } from '@/lib/auth';
import { SUBSCRIPTION_KEYS, FREE_KEYS } from '@/constants/redis-keys';
import { getSecondsUntilNextDailyReset } from '@/lib/auth/billing/helpers';
import {
  FREE_LIMIT_MICRO,
  SUBSCRIPTION_LIMIT_MICRO,
} from '@/lib/auth/billing/limit';
import { AIPricing } from '@/constants/ai-pricing';
import type { BillingBreakdownLine, UserBillingSnapshot } from '@/lib/tableman/user-billing-types';

export type { BillingBreakdownLine, UserBillingSnapshot } from '@/lib/tableman/user-billing-types';

async function redisCostSlot(key: string): Promise<{ raw: string | null; micro: number | null }> {
  const v = await redis.get<string>(key);
  if (v === null || v === undefined) return { raw: null, micro: null };
  const s = String(v);
  const n = parseInt(s, 10);
  return { raw: s, micro: Number.isNaN(n) ? null : n };
}

function microToUsd(micro: number): number {
  return micro / 1_000_000;
}

function dateKeyForTimezone(timezone: string): string {
  const now = new Date();
  const userDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const y = userDate.getFullYear();
  const m = String(userDate.getMonth() + 1).padStart(2, '0');
  const d = String(userDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function openaiCoefficientText(): string {
  const g4o = AIPricing.openai['gpt-4o'];
  const g4m = AIPricing.openai['gpt-4o-mini'];
  return `gpt-4o：输入 $${g4o.inputPer1K}/1K tokens、输出 $${g4o.outputPer1K}/1K；gpt-4o-mini：输入 $${g4m.inputPer1K}/1K、输出 $${g4m.outputPer1K}/1K（USD，按次请求折算为 microUSD 后 INCRBY 写入上列 Redis，并同步 usage.cost_openai_micro）`;
}

function minimaxCoefficientText(): string {
  return `MiniMax TTS：$${AIPricing.minimax.ttsPer1KChars}/1K 字符（USD，(chars/1000)×单价 → microUSD 累加；usage.cost_minimax_tts_micro）`;
}

function blobCoefficientText(): string {
  return `Vercel Blob：$${AIPricing.vercelBlob.storageUsdPerGb}/GB（USD，(bytes/10⁹)×单价 → microUSD 累加；usage.cost_vercel_blob_micro）`;
}

function buildMethodology(): string[] {
  return [
    '总成本 = OpenAI + MiniMax TTS + Vercel Blob 三项 microUSD 之和，与 cost_total_micro 及上方等式一致；单价系数见各分项「系数」行（与 AIPricing / trackUsage 一致）。',
  ];
}

type UsageRow = {
  costTotalMicro: number;
  costOpenaiMicro: number;
  costMinimaxTtsMicro: number;
  costVercelBlobMicro: number;
} | null;

function buildBreakdownLines(
  slots: {
    openai: { raw: string | null; micro: number | null };
    minimax: { raw: string | null; micro: number | null };
    blob: { raw: string | null; micro: number | null };
  },
  keys: { openai: string; minimax: string; blob: string },
  row: UsageRow
): BillingBreakdownLine[] {
  const pick = (
    redisKey: string,
    slot: { raw: string | null; micro: number | null },
    dbVal: number | undefined,
    dbColumn: string,
    id: BillingBreakdownLine['id'],
    label: string,
    coefficientText: string
  ): BillingBreakdownLine => {
    const fromRedis = slot.micro !== null;
    const micro = fromRedis ? slot.micro! : (dbVal ?? 0);
    return {
      id,
      label,
      micro,
      redisKey,
      redisRaw: slot.raw,
      valueSource: fromRedis ? 'redis' : 'db',
      dbColumn,
      dbStoredMicro: dbVal ?? null,
      coefficientText,
    };
  };

  return [
    pick(
      keys.openai,
      slots.openai,
      row?.costOpenaiMicro,
      'cost_openai_micro',
      'openai',
      'OpenAI',
      openaiCoefficientText()
    ),
    pick(
      keys.minimax,
      slots.minimax,
      row?.costMinimaxTtsMicro,
      'cost_minimax_tts_micro',
      'minimax',
      'MiniMax TTS',
      minimaxCoefficientText()
    ),
    pick(
      keys.blob,
      slots.blob,
      row?.costVercelBlobMicro,
      'cost_vercel_blob_micro',
      'vercel_blob',
      'Vercel Blob',
      blobCoefficientText()
    ),
  ];
}

/**
 * 管理后台：汇总用户当前计费周期内的成本与口径说明（Redis 优先，缺失项回退 usage 表）
 */
export async function getUserBillingSnapshot(userId: string): Promise<UserBillingSnapshot> {
  const settings = await getUserSettings(userId);
  const { active, subscription_id: subscriptionId, type: subscriptionType, expireTime } =
    settings.subscription;
  const timezone = settings.timezone || 'Asia/Shanghai';
  const billingAsPaid = !!(active && subscriptionId);
  const methodology = buildMethodology();

  if (billingAsPaid && subscriptionId) {
    const totalKey = SUBSCRIPTION_KEYS.costs.total(userId);
    const openaiKey = SUBSCRIPTION_KEYS.costs.openaiTotal(userId);
    const minimaxKey = SUBSCRIPTION_KEYS.costs.minimaxTts(userId);
    const blobKey = SUBSCRIPTION_KEYS.costs.vercelBlob(userId);

    const row = await db.query.usage.findFirst({
      where: (tbl, { and, eq }) =>
        and(eq(tbl.userId, userId), eq(tbl.subscriptionId, subscriptionId)),
    });

    const [totalSlot, openaiSlot, minimaxSlot, blobSlot] = await Promise.all([
      redisCostSlot(totalKey),
      redisCostSlot(openaiKey),
      redisCostSlot(minimaxKey),
      redisCostSlot(blobKey),
    ]);

    const totalMicro = totalSlot.micro ?? row?.costTotalMicro ?? 0;
    const breakdownLines = buildBreakdownLines(
      { openai: openaiSlot, minimax: minimaxSlot, blob: blobSlot },
      { openai: openaiKey, minimax: minimaxKey, blob: blobKey },
      row
        ? {
            costTotalMicro: row.costTotalMicro,
            costOpenaiMicro: row.costOpenaiMicro,
            costMinimaxTtsMicro: row.costMinimaxTtsMicro,
            costVercelBlobMicro: row.costVercelBlobMicro,
          }
        : null
    );

    const ttl = await redis.ttl(totalKey);
    const settingsKey = `user:${userId}:settings`;

    let resetAtIso: string | null = null;
    let resetHint: string;
    if (ttl > 0) {
      resetAtIso = new Date(Date.now() + ttl * 1000).toISOString();
      resetHint = `来源：Redis 键 \`${totalKey}\` 的过期时刻（与订阅周期写入 Redis 的过期策略一致）。`;
    } else if (ttl === -1) {
      resetHint = `Redis 键 \`${totalKey}\` 存在但未配置过期；下列时间改取自 Redis 键 \`${settingsKey}\`（JSON）中的字段 \`subscription.expireTime\`。`;
      if (expireTime) {
        resetAtIso = new Date(expireTime).toISOString();
      }
    } else {
      resetHint = `未读到有效 Redis 键 \`${totalKey}\`（无键或已过期）；下列时间取自 \`${settingsKey}\` → \`subscription.expireTime\`。`;
      if (expireTime) {
        resetAtIso = new Date(expireTime).toISOString();
      }
    }

    return {
      userId,
      billingAsPaid: true,
      subscriptionActive: active,
      subscriptionType: subscriptionType ?? null,
      subscriptionExpireTime: expireTime || null,
      subscriptionId,
      timezone,
      mode: 'subscription',
      periodLabel: `当前订阅周期（Redis user:${userId}:subscription:cost_micro:*）`,
      totalMicro,
      totalUsd: microToUsd(totalMicro),
      quotaMicro: SUBSCRIPTION_LIMIT_MICRO,
      quotaUsd: microToUsd(SUBSCRIPTION_LIMIT_MICRO),
      totalRedisKey: totalKey,
      totalRedisRaw: totalSlot.raw,
      totalValueSource: totalSlot.micro !== null ? 'redis' : 'db',
      totalDbColumn: 'cost_total_micro',
      totalDbStoredMicro: row?.costTotalMicro ?? null,
      breakdownLines,
      resetAtIso,
      resetHint,
      methodology,
    };
  }

  const periodKey = dateKeyForTimezone(timezone);
  const totalKey = FREE_KEYS.costs.total(userId, periodKey);
  const openaiKey = FREE_KEYS.costs.openaiTotal(userId, periodKey);
  const minimaxKey = FREE_KEYS.costs.minimaxTts(userId, periodKey);
  const blobKey = FREE_KEYS.costs.vercelBlob(userId, periodKey);

  const row = await db.query.usage.findFirst({
    where: (tbl, { and, eq }) =>
      and(eq(tbl.userId, userId), eq(tbl.periodKey, periodKey)),
  });

  const [totalSlot, openaiSlot, minimaxSlot, blobSlot] = await Promise.all([
    redisCostSlot(totalKey),
    redisCostSlot(openaiKey),
    redisCostSlot(minimaxKey),
    redisCostSlot(blobKey),
  ]);

  const totalMicro = totalSlot.micro ?? row?.costTotalMicro ?? 0;
  const breakdownLines = buildBreakdownLines(
    { openai: openaiSlot, minimax: minimaxSlot, blob: blobSlot },
    { openai: openaiKey, minimax: minimaxKey, blob: blobKey },
    row
      ? {
          costTotalMicro: row.costTotalMicro,
          costOpenaiMicro: row.costOpenaiMicro,
          costMinimaxTtsMicro: row.costMinimaxTtsMicro,
          costVercelBlobMicro: row.costVercelBlobMicro,
        }
      : null
  );

  const secondsToReset = getSecondsUntilNextDailyReset(timezone);
  const resetAtIso = new Date(Date.now() + secondsToReset * 1000).toISOString();
  const resetHint = `来源：按用户时区 \`${timezone}\` 与业务规则推算下一重置时刻（与 trackUsage 中免费侧一致：下一日 5:00）。当日费用对应 Redis 键如 \`${totalKey}\`（及同前缀的 openai_total / minimax_tts / vercel_blob）；聚合回退可对照 DB 表 \`usage\`（\`user_id\` + \`period_key\` = \`${periodKey}\`）。`;

  return {
    userId,
    billingAsPaid: false,
    subscriptionActive: active,
    subscriptionType: subscriptionType ?? null,
    subscriptionExpireTime: expireTime || null,
    subscriptionId: subscriptionId ?? null,
    timezone,
    mode: 'free',
    periodLabel: `免费用户 · 用户时区当日 ${periodKey}`,
    totalMicro,
    totalUsd: microToUsd(totalMicro),
    quotaMicro: FREE_LIMIT_MICRO,
    quotaUsd: microToUsd(FREE_LIMIT_MICRO),
    totalRedisKey: totalKey,
    totalRedisRaw: totalSlot.raw,
    totalValueSource: totalSlot.micro !== null ? 'redis' : 'db',
    totalDbColumn: 'cost_total_micro',
    totalDbStoredMicro: row?.costTotalMicro ?? null,
    breakdownLines,
    resetAtIso,
    resetHint,
    methodology,
  };
}
