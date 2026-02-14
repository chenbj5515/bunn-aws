import { redis } from '@/lib/redis';
import { USER_KEYS } from '@/constants/redis-keys';
import type { UserSettings } from './get-user-settings';

/**
 * 初始化用户业务设置（注册后调用）
 */
export async function initUserSettings(userId: string): Promise<void> {
  try {
    const defaultSettings: UserSettings = {
      subscription: {
        active: false,
        expireTime: '',
        type: null,
        subscription_id: null,
      },
      timezone: 'Asia/Shanghai',
      achievementPoints: 0,
      correctAnswersCount: 0,
      totalAnswersCount: 0,
    };
    await redis.set(USER_KEYS.settings(userId), JSON.stringify(defaultSettings));
  } catch (error) {
    console.error('初始化用户设置失败:', error);
  }
}
