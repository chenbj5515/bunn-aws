import { createHash } from "crypto";
import { redis } from "@/lib/redis";
import { TTS_CACHE_PREFIX, TTS_CACHE_EXPIRY } from "../constants";

/**
 * 生成缓存键
 */
export function generateCacheKey(text: string, voiceId: string): string {
  const hash = createHash("sha256").update(text).digest("hex");
  return `${TTS_CACHE_PREFIX}${voiceId}:${hash}`;
}

/**
 * 从缓存获取 TTS 音频
 */
export async function getTTSFromCache(
  text: string,
  voiceId: string
): Promise<string | null> {
  try {
    const cacheKey = generateCacheKey(text, voiceId);
    const cached = await redis.get<string>(cacheKey);
    return cached ?? null;
  } catch (error) {
    console.error("获取 TTS 缓存失败:", error);
    return null;
  }
}

/**
 * 保存 TTS 音频到缓存
 */
export async function saveTTSToCache(
  text: string,
  audioBase64: string,
  voiceId: string
): Promise<boolean> {
  try {
    const cacheKey = generateCacheKey(text, voiceId);
    await redis.set(cacheKey, audioBase64, { ex: TTS_CACHE_EXPIRY });
    return true;
  } catch (error) {
    console.error("保存 TTS 缓存失败:", error);
    return false;
  }
}
