import { redis } from '@/lib/redis';
import { db } from '@/lib/db';
import { getSession, getUserSettings } from '@/lib/auth';
import { SUBSCRIPTION_KEYS, FREE_KEYS } from '@/constants/redis-keys';

/** 订阅用户费用上限：$4 */
const SUBSCRIPTION_LIMIT_MICRO = 4_000_000;
/** 免费用户每日费用上限：$0.1 */
const FREE_LIMIT_MICRO = 100_000;

/**
 * 检查用户是否在配额内
 * @returns true 表示可以继续使用，false 表示已超限
 */
export async function checkLimit(): Promise<boolean> {
  try {
    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) return true;

    const userSettings = await getUserSettings(userId);
    const { active, subscription_id: subscriptionId } = userSettings.subscription;
    const { timezone } = userSettings;

    if (active && subscriptionId) {
      return checkSubscriptionLimit(userId, subscriptionId);
    }
    return checkFreeLimit(userId, timezone);
  } catch {
    return false;
  }
}

/**
 * 订阅用户：检查费用是否超过 $4
 */
async function checkSubscriptionLimit(userId: string, subscriptionId: string): Promise<boolean> {
  // 先读 Redis
  const costMicroStr = await redis.get<string>(SUBSCRIPTION_KEYS.costs.total(userId));

  if (costMicroStr !== null && costMicroStr !== undefined) {
    return parseInt(costMicroStr, 10) < SUBSCRIPTION_LIMIT_MICRO;
  }

  // 回退到 DB
  const row = await db.query.usage.findFirst({
    where: (tbl, { and, eq }) => and(eq(tbl.userId, userId), eq(tbl.subscriptionId, subscriptionId)),
  });

  return (row?.costTotalMicro ?? 0) < SUBSCRIPTION_LIMIT_MICRO;
}

/**
 * 免费用户：检查当日费用是否超过 $0.1
 */
async function checkFreeLimit(userId: string, timezone: string): Promise<boolean> {
  const now = new Date();
  const userDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const dateKey = `${userDate.getFullYear()}-${String(userDate.getMonth() + 1).padStart(2, '0')}-${String(userDate.getDate()).padStart(2, '0')}`;

  // 先读 Redis
  const costMicroStr = await redis.get<string>(FREE_KEYS.costs.total(userId, dateKey));

  if (costMicroStr !== null && costMicroStr !== undefined) {
    return parseInt(costMicroStr, 10) < FREE_LIMIT_MICRO;
  }

  // 回退到 DB
  const row = await db.query.usage.findFirst({
    where: (tbl, { and, eq }) => and(eq(tbl.userId, userId), eq(tbl.periodKey, dateKey)),
  });

  return (row?.costTotalMicro ?? 0) < FREE_LIMIT_MICRO;
}
