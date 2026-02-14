import { redis } from '@/lib/redis';
import { USER_KEYS } from '@/constants/redis-keys';

/**
 * 用户业务设置（与 Session 分离）
 *
 * Session (better-auth)：身份认证 → user.id, user.email, user.name, user.image
 * UserSettings (业务数据)：订阅、偏好、统计等
 *
 * 存储位置：Redis USER_KEYS.settings(userId)
 */
export interface UserSettings {
  /** 订阅状态 */
  subscription: {
    active: boolean;
    expireTime: string;
    type?: 'subscription' | 'oneTime' | null;
    subscription_id?: string | null;
  };
  /** 用户时区 */
  timezone: string;
  /** UI 语言偏好 */
  uiLocale?: string;
  /** 成就点数 */
  achievementPoints: number;
  /** 答题正确数 */
  correctAnswersCount: number;
  /** 答题总数 */
  totalAnswersCount: number;
}

/**
 * 安全解析 Redis 中的用户设置数据
 */
function parseUserSettings(value: unknown): Record<string, any> {
  if (!value) return {};

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  if (typeof value === 'object') {
    return value as Record<string, any>;
  }

  return {};
}

/**
 * 获取用户业务设置
 *
 * 注意：这不是 Session，Session 只用于身份认证
 * 业务数据统一从这里获取
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  try {
    const settingsData = await redis.get(USER_KEYS.settings(userId));
    const settings = parseUserSettings(settingsData);

    const now = new Date();
    const expireTime = settings.subscription?.expireTime
      ? new Date(settings.subscription.expireTime)
      : null;

    return {
      subscription: {
        active: expireTime ? expireTime > now : false,
        expireTime: settings.subscription?.expireTime || '',
        type: settings.subscription?.type || null,
        subscription_id: settings.subscription?.subscription_id || null,
      },
      timezone: settings.timezone || 'Asia/Shanghai',
      uiLocale: settings.uiLocale,
      achievementPoints: settings.achievementPoints || 0,
      correctAnswersCount: settings.correctAnswersCount || 0,
      totalAnswersCount: settings.totalAnswersCount || 0,
    };
  } catch (error) {
    console.error('获取用户设置失败:', error);
    return {
      subscription: { active: false, expireTime: '', type: null, subscription_id: null },
      timezone: 'Asia/Shanghai',
      achievementPoints: 0,
      correctAnswersCount: 0,
      totalAnswersCount: 0,
    };
  }
}
