import { db } from '@/lib/db';
import { userUsageLogs, usage } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { estimateOpenAICostUSD } from './index';
import { calculateCostMicros, type ModelType } from '../cost';

export type TrackUsageParams = {
  inputTokens: number;
  outputTokens: number;
  model: ModelType;
  ipAddress?: string;
};

/**
 * 异步同步到 usage 表
 */
export function syncToDBAsync(
  userId: string,
  data: {
    subscriptionId?: string;
    periodKey?: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    model: ModelType;
    costs: ReturnType<typeof calculateCostMicros>;
  }
) {
  const modelDelta = data.model === 'gpt-4o'
    ? { gpt4oIn: data.inputTokens, gpt4oOut: data.outputTokens, gpt4oTotal: data.totalTokens }
    : { gpt4oMiniIn: data.inputTokens, gpt4oMiniOut: data.outputTokens, gpt4oMiniTotal: data.totalTokens };

  const params = {
    userId,
    subscriptionId: data.subscriptionId,
    periodKey: data.periodKey,
    delta: {
      tokensIn: data.inputTokens,
      tokensOut: data.outputTokens,
      tokensTotal: data.totalTokens,
      ...modelDelta,
      costTotalMicro: data.costs.totalMicro,
      costOpenaiMicro: data.costs.openaiMicro,
      costMinimaxTtsMicro: data.costs.minimaxMicro,
      costVercelBlobMicro: data.costs.blobMicro,
    },
  };

  upsertSubscriptionUsage(params).catch(err => {
    console.error('upsertSubscriptionUsage failed', err instanceof Error ? err.message : err);
  });
}

/**
 * 记录到历史日志表
 */
export async function logUsageToDB(userId: string, params: TrackUsageParams) {
  const { inputTokens, outputTokens, model, ipAddress } = params;
  const totalTokens = inputTokens + outputTokens;
  const tokenCostEstimate = estimateOpenAICostUSD({ model, inputTokens, outputTokens });

  const existing = await db.query.userUsageLogs.findFirst({
    where: (logs, { eq }) => eq(logs.userId, userId),
  });

  if (existing) {
    await db
      .update(userUsageLogs)
      .set({
        tokensUsed: (existing.tokensUsed || 0) + totalTokens,
        ipAddress,
        updateTime: new Date().toISOString(),
      })
      .where(eq(userUsageLogs.id, existing.id));
  } else {
    await db.insert(userUsageLogs).values({
      userId,
      ipAddress,
      tokensUsed: totalTokens,
      tokenCostEstimate: tokenCostEstimate.toString(),
    });
  }
}

/**
 * 更新或插入订阅用量记录
 * - 订阅用户：按 subscriptionId 聚合
 * - 免费用户：按 periodKey (日期) 聚合
 */
// 需要累加的字段
const DELTA_FIELDS = [
  'tokensIn', 'tokensOut', 'tokensTotal',
  'gpt4oIn', 'gpt4oOut', 'gpt4oTotal',
  'gpt4oMiniIn', 'gpt4oMiniOut', 'gpt4oMiniTotal',
  'costTotalMicro', 'costOpenaiMicro', 'costMinimaxTtsMicro', 'costVercelBlobMicro',
] as const;

type DeltaField = (typeof DELTA_FIELDS)[number];
type Delta = Partial<Record<DeltaField, number>>;

async function upsertSubscriptionUsage(params: {
  userId: string;
  subscriptionId?: string | null;
  periodKey?: string | null;
  delta: Delta;
}) {
  const { userId, subscriptionId, periodKey, delta } = params;

  // 时间范围：periodKey 用日期范围，否则用当前时间
  const now = new Date().toISOString();
  const startTime = periodKey ? `${periodKey}T00:00:00.000Z` : now;
  const endTime = periodKey ? `${periodKey}T23:59:59.999Z` : now;

  // 生成 delta 字段的初始值
  const deltaValues = Object.fromEntries(
    DELTA_FIELDS.map(f => [f, delta[f] || 0])
  ) as Record<DeltaField, number>;

  // 生成累加的 set 对象
  const deltaSet = Object.fromEntries(
    DELTA_FIELDS.map(f => [f, sql`${usage[f]} + ${delta[f] || 0}`])
  ) as Record<DeltaField, ReturnType<typeof sql>>;

  await db
    .insert(usage)
    .values({
      userId,
      subscriptionId: subscriptionId || null,
      periodKey: periodKey || null,
      startTime,
      endTime,
      ...deltaValues,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: subscriptionId
        ? [usage.userId, usage.subscriptionId]
        : [usage.userId, usage.periodKey],
      set: {
        ...deltaSet,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}
