export type BillingBreakdownLineId = 'openai' | 'minimax' | 'vercel_blob';

/** 分项：Redis 键、原始值、DB 列、采用值、定价系数（用于内訳等式） */
export type BillingBreakdownLine = {
  id: BillingBreakdownLineId;
  label: string;
  micro: number;
  redisKey: string;
  /** Redis GET 的原始字符串；无键为 null */
  redisRaw: string | null;
  /** 本项 micro 来自 Redis 累加值还是回退 DB */
  valueSource: 'redis' | 'db';
  /** Postgres usage 表列名 */
  dbColumn: string;
  /** 当前周期 usage 行中该列数值（便于对照） */
  dbStoredMicro: number | null;
  /** 写入 trackUsage 时使用的单价系数说明 */
  coefficientText: string;
};

export type UserBillingSnapshot = {
  userId: string;
  billingAsPaid: boolean;
  subscriptionActive: boolean;
  subscriptionType: 'subscription' | 'oneTime' | null;
  subscriptionExpireTime: string | null;
  subscriptionId: string | null;
  timezone: string;
  mode: 'subscription' | 'free';
  periodLabel: string;
  totalMicro: number;
  totalUsd: number;
  quotaMicro: number;
  quotaUsd: number;
  /** 总成本 Redis 键与原始值（与 totalMicro 同源逻辑） */
  totalRedisKey: string;
  totalRedisRaw: string | null;
  totalValueSource: 'redis' | 'db';
  totalDbColumn: string;
  /** 当前周期 usage 行 cost_total_micro（仅对照） */
  totalDbStoredMicro: number | null;
  breakdownLines: BillingBreakdownLine[];
  resetAtIso: string | null;
  resetHint: string;
  methodology: string[];
};
