import Redis from 'ioredis';

/**
 * Redis 客户端封装
 * 
 * 本地开发: 使用 Docker Redis (redis://localhost:6379)
 * 线上环境: 使用 AWS ElastiCache
 * 
 * 环境变量: REDIS_URL
 */

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// 创建 ioredis 实例
const ioredisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // 连接失败时不抛出错误，允许应用继续运行
  lazyConnect: true,
});

// 连接错误处理
ioredisClient.on('error', (err) => {
  console.error('Redis 连接错误:', err.message);
});

ioredisClient.on('connect', () => {
  console.log('Redis 已连接');
});

/**
 * Pipeline 包装类 - 兼容 Upstash API
 */
class PipelineWrapper {
  private pipeline: ReturnType<typeof ioredisClient.pipeline>;

  constructor(client: Redis) {
    this.pipeline = client.pipeline();
  }

  incrby(key: string, value: number) {
    this.pipeline.incrby(key, value);
    return this;
  }

  expire(key: string, ttl: number) {
    this.pipeline.expire(key, ttl);
    return this;
  }

  del(key: string) {
    this.pipeline.del(key);
    return this;
  }

  async exec() {
    return this.pipeline.exec();
  }
}

/**
 * Redis 客户端包装类 - 提供与 Upstash 兼容的 API
 */
class RedisWrapper {
  private client: Redis;

  constructor(client: Redis) {
    this.client = client;
  }

  /**
   * 获取值，自动 JSON 解析
   */
  async get<T = string>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (value === null) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      // 如果不是 JSON，直接返回字符串
      return value as unknown as T;
    }
  }

  /**
   * 设置值，支持可选的过期时间
   */
  async set(key: string, value: string | number | object, options?: { ex?: number }): Promise<'OK' | null> {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    if (options?.ex) {
      return this.client.setex(key, options.ex, stringValue);
    }
    return this.client.set(key, stringValue);
  }

  /**
   * 删除键
   */
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * 按模式搜索键
   */
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  /**
   * 获取 TTL
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * 原子递增
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * 原子递增指定值
   */
  async incrby(key: string, value: number): Promise<number> {
    return this.client.incrby(key, value);
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  /**
   * 创建管道
   */
  pipeline(): PipelineWrapper {
    return new PipelineWrapper(this.client);
  }

  /**
   * 获取原始 ioredis 客户端（高级用法）
   */
  get rawClient(): Redis {
    return this.client;
  }
}

// 导出包装后的 Redis 实例
export const redis = new RedisWrapper(ioredisClient);

// 导出类型
export type { RedisWrapper, PipelineWrapper };
