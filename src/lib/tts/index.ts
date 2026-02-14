"use client";

import { vanillaTrpc } from "@/lib/trpc/client";

// ============================================================
// Types
// ============================================================

type CacheStatus = "HIT" | "MISS" | null;

interface SpeakResult {
  fromCache: boolean;
  cacheStatus: CacheStatus;
}

// ============================================================
// Client-side Cache
// ============================================================

/**
 * 客户端内存缓存
 * 用于避免重复的网络请求，与服务端 Redis 缓存互补
 */
const clientCache = new Map<string, string>();

/**
 * 请求去重：记录正在进行的请求
 */
const inFlightRequests = new Map<string, Promise<string>>();

// ============================================================
// Helpers
// ============================================================

const buildCacheKey = (text: string, language: string): string =>
  `${language}::${text}`;

const normalizeText = (value: string): string => value.trim();

/**
 * 将 base64 字符串转换为 Blob URL
 */
function base64ToAudioUrl(base64: string): string {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "audio/mpeg" });
  return URL.createObjectURL(blob);
}

/**
 * 释放之前的 Blob URL 以避免内存泄漏
 */
function revokePreviousUrl(cacheKey: string): void {
  const previousUrl = clientCache.get(cacheKey);
  if (previousUrl) {
    URL.revokeObjectURL(previousUrl);
  }
}

// ============================================================
// Error Types
// ============================================================

export class TTSError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "TTSError";
    this.code = code;
  }
}

export class RateLimitError extends TTSError {
  constructor(message: string = "已达到使用限额") {
    super(message, "RATE_LIMIT");
    this.name = "RateLimitError";
  }
}

// ============================================================
// Core Functions
// ============================================================

interface FetchTTSOptions {
  text: string;
  language?: string;
  skipCache?: boolean;
}

interface FetchTTSResult {
  audioUrl: string;
  cacheHit: boolean;
  fromClientCache: boolean;
}

/**
 * 获取 TTS 音频（带客户端缓存和请求去重）
 */
async function fetchTTSAudio(options: FetchTTSOptions): Promise<FetchTTSResult> {
  const { text, language = "ja", skipCache = false } = options;
  const normalizedText = normalizeText(text);

  if (!normalizedText) {
    throw new TTSError("文本不能为空", "EMPTY_TEXT");
  }

  const cacheKey = buildCacheKey(normalizedText, language);

  // 1. 检查客户端缓存
  if (!skipCache && clientCache.has(cacheKey)) {
    return {
      audioUrl: clientCache.get(cacheKey)!,
      cacheHit: true,
      fromClientCache: true,
    };
  }

  // 2. 请求去重
  const requestKey = skipCache ? `${cacheKey}::skip` : cacheKey;
  const pending = inFlightRequests.get(requestKey);
  if (pending) {
    const audioUrl = await pending;
    return {
      audioUrl,
      cacheHit: true,
      fromClientCache: true,
    };
  }

  // 3. 发起新请求
  const promise = (async (): Promise<string> => {
    try {
      const result = await vanillaTrpc.tts.synthesize.mutate({
        text: normalizedText,
        language,
        skipCache,
      });

      if (result.rateLimited) {
        throw new RateLimitError();
      }

      const audioUrl = base64ToAudioUrl(result.audioBase64);

      // 更新客户端缓存
      revokePreviousUrl(cacheKey);
      clientCache.set(cacheKey, audioUrl);

      return audioUrl;
    } finally {
      inFlightRequests.delete(requestKey);
    }
  })();

  inFlightRequests.set(requestKey, promise);

  const audioUrl = await promise;
  return {
    audioUrl,
    cacheHit: false,
    fromClientCache: false,
  };
}

/**
 * 处理 tRPC 错误（rateLimited 已在响应中处理，此处处理其他异常）
 */
function handleTRPCError(error: unknown): never {
  if (error instanceof RateLimitError) {
    throw error;
  }
  throw error;
}

// ============================================================
// Public API
// ============================================================

/**
 * 使用 Minimax 服务将文本转换为语音并播放
 *
 * @param text - 要转换的文本
 * @param language - 语言代码，默认 'ja'
 * @param skipCache - 是否跳过缓存，默认 false
 * @returns 播放结果，包含缓存状态
 *
 * @example
 * await speakTextWithMinimax("こんにちは");
 * await speakTextWithMinimax("Hello", "en");
 */
export async function speakTextWithMinimax(
  text: string,
  language: string = "ja",
  skipCache: boolean = false
): Promise<SpeakResult> {
  try {
    const { audioUrl, cacheHit, fromClientCache } = await fetchTTSAudio({
      text,
      language,
      skipCache,
    });

    const audio = new Audio(audioUrl);
    await audio.play();

    return {
      fromCache: fromClientCache,
      cacheStatus: cacheHit ? "HIT" : "MISS",
    };
  } catch (error) {
    console.error("TTS 出错:", error);
    handleTRPCError(error);
  }
}

/**
 * 预加载文本语音（不播放）
 *
 * @param text - 要预加载的文本
 * @param language - 语言代码，默认 'ja'
 * @returns 音频 URL，失败返回 null
 *
 * @example
 * await prefetchTextWithMinimax("明日の天気");
 */
export async function prefetchTextWithMinimax(
  text: string,
  language: string = "ja"
): Promise<string | null> {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return null;

  try {
    const { audioUrl } = await fetchTTSAudio({
      text: normalizedText,
      language,
    });
    return audioUrl;
  } catch (error) {
    console.error("TTS 预加载出错:", error);
    return null;
  }
}

/**
 * 检查文本是否已在客户端缓存中
 *
 * @param text - 要检查的文本
 * @param language - 语言代码，默认 'ja'
 * @returns 是否已缓存
 */
export function isTextCachedWithMinimax(
  text: string,
  language: string = "ja"
): boolean {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return false;

  const cacheKey = buildCacheKey(normalizedText, language);
  return clientCache.has(cacheKey);
}
