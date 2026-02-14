import { redis } from '@/lib/redis';
import { USER_KEYS } from '@/constants/redis-keys';
import { getUserSettings, type UserSettings } from './get-user-settings';

/**
 * 更新用户成就点数
 */
export async function updateUserAchievementPoints(
  userId: string,
  achievementPoints: number
): Promise<void> {
  const currentSettings = await getUserSettings(userId);
  const updatedSettings: UserSettings = {
    ...currentSettings,
    achievementPoints,
  };
  await redis.set(USER_KEYS.settings(userId), JSON.stringify(updatedSettings));
}

/**
 * 更新用户设置（通用）
 */
export async function updateUserSettings(
  userId: string,
  updates: Partial<Omit<UserSettings, 'subscription'>>
): Promise<void> {
  const currentSettings = await getUserSettings(userId);
  const updatedSettings: UserSettings = {
    ...currentSettings,
    ...updates,
  };
  await redis.set(USER_KEYS.settings(userId), JSON.stringify(updatedSettings));
}
