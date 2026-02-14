import { redis } from '@/lib/redis';
import { getSession, getUserSettings } from '@/lib/auth';
import { SUBSCRIPTION_KEYS, FREE_KEYS } from '@/constants/redis-keys';
import { getSecondsUntilNextDailyReset } from '@/lib/auth/billing/helpers';
import { batchIncrementWithExpire } from '@/lib/auth/billing/helpers/redis';
import { syncToDBAsync, logUsageToDB } from '@/lib/auth/billing/helpers/persistence';
import { calculateCostMicros, type ModelType, type CostMeta } from './cost';

export type { ModelType, CostMeta };

export type TrackUsageParams = {
  inputTokens: number;
  outputTokens: number;
  model: ModelType;
  ipAddress?: string;
  costMeta?: CostMeta;
};

// ============================================================
// 核心追踪逻辑
// ============================================================

type Increment = { key: string; value: number };

/**
 * 追踪用量和费用
 * - 订阅用户：按订阅周期累计
 * - 免费用户：按日累计
 */
export async function trackUsage(params: TrackUsageParams) {
  try {
    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) return { inputTokens: 0, outputTokens: 0 };

    const userSettings = await getUserSettings(userId);
    const { active, subscription_id: subscriptionId } = userSettings.subscription;
    const { timezone } = userSettings;
    const totalTokens = params.inputTokens + params.outputTokens;

    if (active && subscriptionId) {
      await trackSubscriptionUsage(userId, subscriptionId, params, totalTokens);
    } else {
      await trackFreeUsage(userId, timezone, params, totalTokens);
    }

    // 异步记录到 DB（历史记录表）
    logUsageToDB(userId, params).catch(() => {});

    return { inputTokens: params.inputTokens, outputTokens: params.outputTokens };
  } catch {
    return { inputTokens: 0, outputTokens: 0 };
  }
}

/**
 * 订阅用户：按订阅周期累计
 * 
 * 追踪内容：
 * 1. Token 用量（总量 + 按模型分类）
 * 2. 费用（OpenAI + Minimax TTS + Vercel Blob）
 * 
 * 所有 key 的 TTL 与订阅周期同步
 */
async function trackSubscriptionUsage(
  userId: string,
  subscriptionId: string,
  params: TrackUsageParams,
  totalTokens: number
) {
  const { inputTokens, outputTokens, model, costMeta } = params;
  const costs = calculateCostMicros({ model, inputTokens, outputTokens, costMeta });

  const modelKeys = model === 'gpt-4o'
    ? SUBSCRIPTION_KEYS.modelTokens.gpt4o
    : SUBSCRIPTION_KEYS.modelTokens.gpt4oMini;

  // 定义要追踪的指标：key -> 增量值
  const increments: Increment[] = [
    // Token 总量
    { key: SUBSCRIPTION_KEYS.tokensInput(userId), value: inputTokens },
    { key: SUBSCRIPTION_KEYS.tokensOutput(userId), value: outputTokens },
    // Token 按模型分类
    { key: modelKeys.input(userId), value: inputTokens },
    { key: modelKeys.output(userId), value: outputTokens },
    { key: modelKeys.total(userId), value: totalTokens },
    // 费用明细
    { key: SUBSCRIPTION_KEYS.costs.openaiTotal(userId), value: costs.openaiMicro },
    { key: SUBSCRIPTION_KEYS.costs.minimaxTts(userId), value: costs.minimaxMicro },
    { key: SUBSCRIPTION_KEYS.costs.vercelBlob(userId), value: costs.blobMicro },
    // 费用汇总
    { key: SUBSCRIPTION_KEYS.costs.total(userId), value: costs.totalMicro },
  ];

  // 获取订阅周期的 TTL
  const ttl = await redis.ttl(`user:${userId}:subscription`);

  // 批量累加 + 设置过期时间
  await batchIncrementWithExpire(increments, ttl);

  // 同步到 DB
  syncToDBAsync(userId, { subscriptionId, inputTokens, outputTokens, totalTokens, model, costs });
}

/**
 * 免费用户：按日累计
 * 
 * 追踪内容：
 * 1. 费用（OpenAI + Minimax TTS + Vercel Blob）
 * 
 * 所有 key 的 TTL 到用户时区的次日零点重置
 */
async function trackFreeUsage(
  userId: string,
  timezone: string,
  params: TrackUsageParams,
  totalTokens: number
) {
  const { inputTokens, outputTokens, model, costMeta } = params;
  const costs = calculateCostMicros({ model, inputTokens, outputTokens, costMeta });

  // 按用户时区计算日期 key
  const now = new Date();
  const userDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const dateKey = `${userDate.getFullYear()}-${String(userDate.getMonth() + 1).padStart(2, '0')}-${String(userDate.getDate()).padStart(2, '0')}`;

  // 定义要追踪的指标：key -> 增量值（免费用户只追踪费用，不追踪 token）
  const increments: Increment[] = [
    { key: FREE_KEYS.costs.openaiTotal(userId, dateKey), value: costs.openaiMicro },
    { key: FREE_KEYS.costs.minimaxTts(userId, dateKey), value: costs.minimaxMicro },
    { key: FREE_KEYS.costs.vercelBlob(userId, dateKey), value: costs.blobMicro },
    { key: FREE_KEYS.costs.total(userId, dateKey), value: costs.totalMicro },
  ];

  // TTL 到次日零点
  const ttl = getSecondsUntilNextDailyReset(timezone);

  // 批量累加 + 设置过期时间
  await batchIncrementWithExpire(increments, ttl);

  // 同步到 DB
  syncToDBAsync(userId, { periodKey: dateKey, inputTokens, outputTokens, totalTokens, model, costs });
}
