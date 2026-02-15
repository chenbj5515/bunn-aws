/**
 * Redis 数据迁移脚本
 * 从 Upstash Redis 迁移到本地/AWS Redis
 *
 * 使用方法: pnpm tsx scripts/migrate-redis.ts
 */

import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';

// 手动加载 .env 文件
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=');
          // 移除引号
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

// Upstash Redis REST API 配置（从 .env 读取）
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// 目标 Redis 配置
const TARGET_REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.error('❌ 请设置 UPSTASH_REDIS_REST_URL 和 UPSTASH_REDIS_REST_TOKEN 环境变量');
  process.exit(1);
}

// Upstash REST API 请求函数
async function upstashCommand(command: string[]): Promise<unknown> {
  const response = await fetch(`${UPSTASH_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`Upstash API 错误: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.result;
}

// 获取所有 keys
async function getAllKeys(): Promise<string[]> {
  const keys = await upstashCommand(['KEYS', '*']);
  return keys as string[];
}

// 获取 key 的类型
async function getKeyType(key: string): Promise<string> {
  const type = await upstashCommand(['TYPE', key]);
  return type as string;
}

// 获取 key 的 TTL
async function getKeyTTL(key: string): Promise<number> {
  const ttl = await upstashCommand(['TTL', key]);
  return ttl as number;
}

// 获取 string 类型的值
async function getString(key: string): Promise<string | null> {
  const value = await upstashCommand(['GET', key]);
  return value as string | null;
}

// 获取 hash 类型的值
async function getHash(key: string): Promise<Record<string, string>> {
  const result = await upstashCommand(['HGETALL', key]);
  const arr = result as string[];
  const hash: Record<string, string> = {};
  for (let i = 0; i < arr.length; i += 2) {
    hash[arr[i]] = arr[i + 1];
  }
  return hash;
}

// 获取 list 类型的值
async function getList(key: string): Promise<string[]> {
  const result = await upstashCommand(['LRANGE', key, '0', '-1']);
  return result as string[];
}

// 获取 set 类型的值
async function getSet(key: string): Promise<string[]> {
  const result = await upstashCommand(['SMEMBERS', key]);
  return result as string[];
}

// 获取 zset 类型的值
async function getZSet(key: string): Promise<Array<{ member: string; score: number }>> {
  const result = await upstashCommand(['ZRANGE', key, '0', '-1', 'WITHSCORES']);
  const arr = result as string[];
  const zset: Array<{ member: string; score: number }> = [];
  for (let i = 0; i < arr.length; i += 2) {
    zset.push({ member: arr[i], score: parseFloat(arr[i + 1]) });
  }
  return zset;
}

async function migrate() {
  console.log('🚀 开始 Redis 数据迁移...');
  console.log(`📤 源: Upstash Redis (${UPSTASH_URL})`);
  console.log(`📥 目标: ${TARGET_REDIS_URL}`);
  console.log('');

  // 连接目标 Redis
  const targetRedis = new Redis(TARGET_REDIS_URL);

  targetRedis.on('error', (err) => {
    console.error('❌ 目标 Redis 连接错误:', err.message);
  });

  try {
    // 测试连接
    await targetRedis.ping();
    console.log('✅ 目标 Redis 连接成功');

    // 获取所有 keys
    const keys = await getAllKeys();
    console.log(`📊 发现 ${keys.length} 个 keys 需要迁移`);
    console.log('');

    if (keys.length === 0) {
      console.log('✅ 没有数据需要迁移');
      await targetRedis.quit();
      return;
    }

    // 显示 keys 列表
    console.log('📋 Keys 列表:');
    keys.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key}`);
    });
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    // 迁移每个 key
    for (const key of keys) {
      try {
        const type = await getKeyType(key);
        const ttl = await getKeyTTL(key);

        console.log(`🔄 迁移 [${type}] ${key}${ttl > 0 ? ` (TTL: ${ttl}s)` : ''}`);

        switch (type) {
          case 'string': {
            const value = await getString(key);
            if (value !== null) {
              if (ttl > 0) {
                await targetRedis.setex(key, ttl, value);
              } else {
                await targetRedis.set(key, value);
              }
            }
            break;
          }
          case 'hash': {
            const hash = await getHash(key);
            if (Object.keys(hash).length > 0) {
              await targetRedis.hset(key, hash);
              if (ttl > 0) {
                await targetRedis.expire(key, ttl);
              }
            }
            break;
          }
          case 'list': {
            const list = await getList(key);
            if (list.length > 0) {
              await targetRedis.rpush(key, ...list);
              if (ttl > 0) {
                await targetRedis.expire(key, ttl);
              }
            }
            break;
          }
          case 'set': {
            const set = await getSet(key);
            if (set.length > 0) {
              await targetRedis.sadd(key, ...set);
              if (ttl > 0) {
                await targetRedis.expire(key, ttl);
              }
            }
            break;
          }
          case 'zset': {
            const zset = await getZSet(key);
            if (zset.length > 0) {
              const members: (string | number)[] = [];
              for (const item of zset) {
                members.push(item.score, item.member);
              }
              await targetRedis.zadd(key, ...members);
              if (ttl > 0) {
                await targetRedis.expire(key, ttl);
              }
            }
            break;
          }
          default:
            console.log(`   ⚠️ 跳过未知类型: ${type}`);
        }

        successCount++;
        console.log(`   ✅ 完成`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ 失败:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('');
    console.log('📊 迁移完成统计:');
    console.log(`   ✅ 成功: ${successCount}`);
    console.log(`   ❌ 失败: ${errorCount}`);
    console.log(`   📦 总计: ${keys.length}`);
  } finally {
    await targetRedis.quit();
  }
}

// 运行迁移
migrate().catch((error) => {
  console.error('❌ 迁移失败:', error);
  process.exit(1);
});
