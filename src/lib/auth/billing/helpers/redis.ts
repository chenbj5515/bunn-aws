import { redis } from '@/lib/redis';

type Increment = { key: string; value: number };

/**
 * 批量执行 Redis INCRBY，并设置过期时间
 */
export async function batchIncrementWithExpire(increments: Increment[], ttl: number) {
  const validIncrements = increments.filter(i => i.value > 0);
  if (validIncrements.length === 0) return;

  const pipeline = redis.pipeline();
  validIncrements.forEach(({ key, value }) => pipeline.incrby(key, value));
  await pipeline.exec();

  if (ttl > 0) {
    const expirePipeline = redis.pipeline();
    validIncrements.forEach(({ key }) => expirePipeline.expire(key, ttl));
    await expirePipeline.exec();
  }
}
