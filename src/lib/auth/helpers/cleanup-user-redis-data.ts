import { redis } from '@/lib/redis';

/**
 * 清理 Redis 中的用户数据（删除账号时调用）
 */
export async function cleanupUserRedisData(userId: string): Promise<void> {
  try {
    const [tokenKeys, userKeys, sessionKeys] = await Promise.all([
      redis.keys(`token:${userId}:*`),
      redis.keys(`user:${userId}:*`),
      redis.keys(`active-sessions-${userId}`),
    ]);

    const keysToDelete = [...tokenKeys, ...userKeys, ...sessionKeys];

    if (keysToDelete.length > 0) {
      const pipeline = redis.pipeline();
      for (const key of keysToDelete) {
        pipeline.del(key);
      }
      await pipeline.exec();
    }
  } catch (error) {
    console.error('清理用户 Redis 数据失败:', error);
  }
}
