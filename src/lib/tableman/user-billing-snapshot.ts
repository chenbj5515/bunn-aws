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
import type { BillingBreakdownItem, UserBillingSnapshot } from '@/lib/tableman/user-billing-types';

export type { BillingBreakdownItem, UserBillingSnapshot } from '@/lib/tableman/user-billing-types';

async function microFromRedis(key: string): Promise<number | null> {
  const v = await redis.get<string>(key);
  if (v === null || v === undefined) return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
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

function buildMethodology(): string[] {
  const g4o = AIPricing.openai['gpt-4o'];
  const g4m = AIPricing.openai['gpt-4o-mini'];
  return [
    '总成本 = OpenAI 估算 + MiniMax TTS + Vercel Blob 三项之和，均以 microUSD（10⁻⁶ 美元）在 Redis / usage 表中累计。',
    `OpenAI：每次 trackUsage 按模型与 input/output tokens，用「$/1K tokens」折算。当前定价：gpt-4o 输入 $${g4o.inputPer1K}/1K、输出 $${g4o.outputPer1K}/1K；gpt-4o-mini 输入 $${g4m.inputPer1K}/1K、输出 $${g4m.outputPer1K}/1K（与 estimateOpenAICostMicroUSD 一致，可被 ENV 覆盖）。`,
    `MiniMax TTS：字符数 ÷ 1000 × $${AIPricing.minimax.ttsPer1KChars}/1K 字符（costMeta.provider === 'minimax' 时计入）。`,
    `Vercel Blob：字节数 ÷ 10⁹ × $${AIPricing.vercelBlob.storageUsdPerGb}/GB（costMeta.provider === 'blob' 时计入）。`,
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

    const rTotal = await microFromRedis(totalKey);
    const rOpenai = await microFromRedis(openaiKey);
    const rMinimax = await microFromRedis(minimaxKey);
    const rBlob = await microFromRedis(blobKey);

    const totalMicro = rTotal ?? row?.costTotalMicro ?? 0;
    const openaiMicro = rOpenai ?? row?.costOpenaiMicro ?? 0;
    const minimaxMicro = rMinimax ?? row?.costMinimaxTtsMicro ?? 0;
    const blobMicro = rBlob ?? row?.costVercelBlobMicro ?? 0;

    const ttl = await redis.ttl(totalKey);

    let resetAtIso: string | null = null;
    let resetHint: string;
    if (ttl > 0) {
      resetAtIso = new Date(Date.now() + ttl * 1000).toISOString();
      resetHint =
        '根据订阅维度费用键的 Redis TTL 推算，与 trackUsage 为订阅键设置的过期时间一致（通常对齐订阅周期）。';
    } else if (ttl === -1) {
      resetHint =
        '费用键存在但未设置 TTL，无法从 Redis 推算清零时间；若用户有订阅到期时间，可参考下方订阅到期。';
      if (expireTime) {
        resetAtIso = new Date(expireTime).toISOString();
        resetHint +=
          ' 下列时间来自用户设置中的订阅到期时间，可能与成本键重置不完全一致。';
      }
    } else {
      resetHint =
        '当前无订阅周期费用键或已过期；若有订阅，以下用用户设置中的订阅到期作为参考。';
      if (expireTime) {
        resetAtIso = new Date(expireTime).toISOString();
      }
    }

    const breakdown: BillingBreakdownItem[] = [
      {
        id: 'openai',
        label: 'OpenAI（tokens 估算）',
        micro: openaiMicro,
        usd: microToUsd(openaiMicro),
        calculationNote:
          '各次 AI 请求按模型累计 input/output tokens，再按 AIPricing 中该模型的 $/1K 单价换算后求和。',
      },
      {
        id: 'minimax',
        label: 'MiniMax TTS',
        micro: minimaxMicro,
        usd: microToUsd(minimaxMicro),
        calculationNote:
          '仅在 tts.synthesize 等路径传入 costMeta.provider=minimax 且提供 chars 时累加。',
      },
      {
        id: 'vercel_blob',
        label: 'Vercel Blob',
        micro: blobMicro,
        usd: microToUsd(blobMicro),
        calculationNote:
          '上传等路径传入 costMeta.provider=blob 与 bytes 时，按存储单价折算。',
      },
    ];

    return {
      userId,
      billingAsPaid: true,
      subscriptionActive: active,
      subscriptionType: subscriptionType ?? null,
      subscriptionExpireTime: expireTime || null,
      subscriptionId,
      timezone,
      mode: 'subscription',
      periodLabel: '当前订阅周期（与 Redis 订阅费用键 TTL 对齐）',
      totalMicro,
      totalUsd: microToUsd(totalMicro),
      quotaMicro: SUBSCRIPTION_LIMIT_MICRO,
      quotaUsd: microToUsd(SUBSCRIPTION_LIMIT_MICRO),
      breakdown,
      resetAtIso,
      resetHint,
      costKeyTtlSeconds: ttl >= -1 ? ttl : null,
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

  const rTotal = await microFromRedis(totalKey);
  const rOpenai = await microFromRedis(openaiKey);
  const rMinimax = await microFromRedis(minimaxKey);
  const rBlob = await microFromRedis(blobKey);

  const totalMicro = rTotal ?? row?.costTotalMicro ?? 0;
  const openaiMicro = rOpenai ?? row?.costOpenaiMicro ?? 0;
  const minimaxMicro = rMinimax ?? row?.costMinimaxTtsMicro ?? 0;
  const blobMicro = rBlob ?? row?.costVercelBlobMicro ?? 0;

  const ttl = await redis.ttl(totalKey);
  const secondsToReset = getSecondsUntilNextDailyReset(timezone);
  const resetAtIso = new Date(Date.now() + secondsToReset * 1000).toISOString();
  const resetHint =
    '免费用户按用户设置时区「下一个凌晨 5:00」重置当日成本累计（与 getSecondsUntilNextDailyReset 一致）；日期维度键为 token:{userId}:{YYYY-MM-DD}:cost_micro:*。';

  const breakdown: BillingBreakdownItem[] = [
    {
      id: 'openai',
      label: 'OpenAI（tokens 估算）',
      micro: openaiMicro,
      usd: microToUsd(openaiMicro),
      calculationNote:
        '各次请求按模型与 tokens 用 OpenAI 单价估算后计入当日键。',
    },
    {
      id: 'minimax',
      label: 'MiniMax TTS',
      micro: minimaxMicro,
      usd: microToUsd(minimaxMicro),
      calculationNote: 'TTS 按字符与每千字符单价计入当日。',
    },
    {
      id: 'vercel_blob',
      label: 'Vercel Blob',
      micro: blobMicro,
      usd: microToUsd(blobMicro),
      calculationNote: '按上传字节与 $/GB 计入当日。',
    },
  ];

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
    breakdown,
    resetAtIso,
    resetHint,
    costKeyTtlSeconds: ttl >= -1 ? ttl : null,
    methodology,
  };
}
