import { trpc, toApiError } from '@/lib/trpc-client';
import { RateLimitError } from '@/lib/errors';

/**
 * 客户端TTS缓存存储
 * 注意: 这是前端内存缓存，与后端Redis缓存互补但独立工作
 */
const clientTTSCache = new Map<string, string>();
const clientTTSInFlight = new Map<string, Promise<FetchTTSResult>>();

type RedisCacheStatus = 'HIT' | 'MISS' | null;

interface FetchTTSResult {
  audioUrl: string;
  redisCache: RedisCacheStatus;
  fromCache: boolean;
}

const buildCacheKey = (text: string, language: string) => `${language}::${text}`;
const normalizeText = (value: string) => value.trim();

interface FetchAndCacheOptions {
  text: string;
  language?: string;
  skipCache?: boolean;
}

async function fetchAndCacheTTSAudio({ text, language = 'ja', skipCache = false }: FetchAndCacheOptions): Promise<FetchTTSResult> {
  const normalizedText = normalizeText(text);
  if (!normalizedText) {
    throw new Error('TTS 文本不能为空');
  }

  const cacheKey = buildCacheKey(normalizedText, language);

  if (!skipCache && clientTTSCache.has(cacheKey)) {
    return {
      audioUrl: clientTTSCache.get(cacheKey)!,
      redisCache: null,
      fromCache: true,
    };
  }

  const requestKey = skipCache ? `${cacheKey}::skip` : cacheKey;
  const pending = clientTTSInFlight.get(requestKey);
  if (pending) {
    return pending;
  }

  const promise: Promise<FetchTTSResult> = (async () => {
    try {
      const result = await trpc.tts.synthesize.mutate({
        text: normalizedText,
        language,
        skipCache,
      });

      if (result.rateLimited) {
        throw new RateLimitError('已达到使用限额');
      }

      const redisCache: RedisCacheStatus = result.cacheHit ? 'HIT' : 'MISS';

      // 将 base64 转换为 blob URL
      const binaryString = atob(result.audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);

      const previousUrl = clientTTSCache.get(cacheKey);
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }

      clientTTSCache.set(cacheKey, audioUrl);

      return {
        audioUrl,
        redisCache,
        fromCache: false,
      };
    } catch (error) {
      if (error instanceof RateLimitError) throw error;
      throw toApiError(error);
    } finally {
      clientTTSInFlight.delete(requestKey);
    }
  })();

  clientTTSInFlight.set(requestKey, promise);
  return promise;
}

/**
 * 使用Minimax服务将文本转换为语音并播放
 * 该函数会自动缓存已获取的音频数据，避免重复请求相同的文本
 * 同时，后端也会在Redis中缓存TTS结果
 */
export const speakTextWithMinimax = async (
  text: string,
  language: string = 'ja',
  skipCache: boolean = false
): Promise<{
  fromCache: boolean;
  redisCache: RedisCacheStatus;
}> => {
  try {
    const { audioUrl, fromCache, redisCache } = await fetchAndCacheTTSAudio({
      text,
      language,
      skipCache,
    });
    const audio = new Audio(audioUrl);
    await audio.play();
    return { fromCache, redisCache };
  } catch (error) {
    console.error("Minimax TTS 出错:", error);
    throw error;
  }
};

/**
 * 预取文本对应的Minimax语音并缓存到本地，不触发播放
 */
export const prefetchTextWithMinimax = async (
  text: string,
  language: string = 'ja'
): Promise<string | null> => {
  const normalizedText = normalizeText(text);
  if (!normalizedText) {
    return null;
  }

  const cacheKey = buildCacheKey(normalizedText, language);

  if (clientTTSCache.has(cacheKey)) {
    return clientTTSCache.get(cacheKey) || null;
  }

  const { audioUrl } = await fetchAndCacheTTSAudio({ text: normalizedText, language });
  return audioUrl;
};

/**
 * 判断给定文本在客户端TTS缓存中是否已存在
 * 仅检查前端内存缓存，不包含Redis等服务端缓存
 */
export const isTextCachedWithMinimax = (
  text: string,
  language: string = "ja",
): boolean => {
  const normalizedText = normalizeText(text);
  if (!normalizedText) {
    return false;
  }
  const cacheKey = buildCacheKey(normalizedText, language);
  return clientTTSCache.has(cacheKey);
};
