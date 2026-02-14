import { redis } from "@/lib/redis";
import { db, user as userTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { DEFAULT_VOICE_ID } from "../constants";

interface ResolveVoiceOptions {
  userId?: string;
}

/**
 * 根据用户 ID 获取声音 ID
 * 优先从 Redis 缓存读取，兜底查数据库
 */
export async function resolveVoiceId({
  userId,
}: ResolveVoiceOptions = {}): Promise<string> {
  if (!userId) {
    return DEFAULT_VOICE_ID;
  }

  try {
    // 先读 Redis 缓存
    const [preferred, cachedVoice] = await Promise.all([
      redis.get<string>(`user:${userId}:tts:preferred`),
      redis.get<string>(`user:${userId}:tts:voice_id`),
    ]);

    if (preferred === "custom" && cachedVoice) {
      return cachedVoice;
    }

    // 兜底 DB
    const rows = await db
      .select({
        ttsVoiceId: userTable.ttsVoiceId,
        preferred: userTable.preferredTTSVoice,
      })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    const row = rows?.[0];
    if (row?.preferred === "custom" && row?.ttsVoiceId) {
      return row.ttsVoiceId;
    }
  } catch (error) {
    console.warn("获取用户语音配置失败，将使用默认语音:", error);
  }

  return DEFAULT_VOICE_ID;
}
