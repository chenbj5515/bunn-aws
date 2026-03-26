import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "@/lib/tableman/auth";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export interface RedisKeyEntry {
  key: string;
  type: string;
  ttl: number;
  value: string | null;
}

export interface RedisKeysResponse {
  keys: RedisKeyEntry[];
  total: number;
  userId: string;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return unauthorizedResponse(admin);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const patterns = [
      `user:${userId}:*`,
      `token:${userId}:*`,
      `random-cards:${userId}:*`,
      `review:${userId}:*`,
      `active-sessions-${userId}`,
      `webhook:user:${userId}:*`,
    ];

    const allKeys: string[] = [];

    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      allKeys.push(...keys);
    }

    const uniqueKeys = [...new Set(allKeys)].sort();

    const keyEntries: RedisKeyEntry[] = await Promise.all(
      uniqueKeys.map(async (key) => {
        const type = await redis.type(key);
        const ttl = await redis.ttl(key);
        
        let value: string | null = null;
        try {
          if (type === "string") {
            const rawValue = await redis.rawClient.get(key);
            value = rawValue;
          } else if (type === "hash") {
            const hashValue = await redis.hgetall(key);
            value = JSON.stringify(hashValue, null, 2);
          } else if (type === "list") {
            const listValue = await redis.lrange(key, 0, -1);
            value = JSON.stringify(listValue, null, 2);
          } else if (type === "set") {
            const setValue = await redis.smembers(key);
            value = JSON.stringify(setValue, null, 2);
          } else if (type === "zset") {
            const zsetValue = await redis.zrange(key, 0, -1, { withScores: true });
            value = JSON.stringify(zsetValue, null, 2);
          }
        } catch {
          value = "[无法读取]";
        }

        return {
          key,
          type,
          ttl,
          value,
        };
      })
    );

    const response: RedisKeysResponse = {
      keys: keyEntries,
      total: keyEntries.length,
      userId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching redis keys:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch redis keys" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return unauthorizedResponse(admin);
  }

  try {
    const body = await request.json();
    const { key, value, ttl } = body;

    if (!key) {
      return NextResponse.json(
        { error: "key is required" },
        { status: 400 }
      );
    }

    const type = await redis.type(key);

    if (type === "string" || type === "none") {
      if (value !== undefined) {
        await redis.set(key, value);
      }
      if (ttl !== undefined && ttl > 0) {
        await redis.expire(key, ttl);
      } else if (ttl === -1) {
        await redis.persist(key);
      }
    } else {
      return NextResponse.json(
        { error: `不支持更新类型为 ${type} 的 key` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating redis key:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update redis key" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return unauthorizedResponse(admin);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "key is required" },
        { status: 400 }
      );
    }

    await redis.del(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting redis key:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete redis key" },
      { status: 500 }
    );
  }
}
