import { z } from 'zod';

// ============================================
// 通用 Schema
// ============================================

/**
 * Base64 图片校验
 */
const imageBase64Schema = z
  .string()
  .min(100, '图片数据不能为空')
  .refine(
    (s) => /^[A-Za-z0-9+/=]+$/.test(s),
    '图片格式不正确'
  );

// ============================================
// AI Router Schemas
// ============================================

// --- 字幕提取 ---
export const extractSubtitlesInput = z.object({
  imageBase64: imageBase64Schema,
});

export const extractSubtitlesOutput = z.union([
  z.object({ errorCode: z.null(), subtitles: z.string() }),
  z.object({ errorCode: z.number() }),
]);

export type ExtractSubtitlesInput = z.infer<typeof extractSubtitlesInput>;
export type ExtractSubtitlesOutput = z.infer<typeof extractSubtitlesOutput>;

// --- 翻译和注音 ---
export const translateAndRubyInput = z.object({
  text: z.string().min(1, '文本不能为空').max(1000, '文本过长'),
  fallbackLocale: z.string().default('zh'),
});

export const translateAndRubyOutput = z.union([
  z.object({
    errorCode: z.null(),
    translation: z.record(z.string(), z.string()),
    rubyHtml: z.string(),
    rubyTranslations: z.record(z.string(), z.record(z.string(), z.string())),
  }),
  z.object({ errorCode: z.number() }),
]);

export type TranslateAndRubyInput = z.infer<typeof translateAndRubyInput>;
export type TranslateAndRubyOutput = z.infer<typeof translateAndRubyOutput>;

// --- 单词干扰项 ---
export const generateWordDistractionsInput = z.object({
  word: z.string().min(1),
  kanaPronunciation: z.string(),
  meaning: z.record(z.string(), z.string()),
});

export const generateWordDistractionsOutput = z.union([
  z.object({
    errorCode: z.null(),
    meaningDistractions: z.object({ zh: z.array(z.string()), en: z.array(z.string()) }),
    pronunciationDistractions: z.array(z.string()),
    correctPronunciation: z.string().optional(),
  }),
  z.object({ errorCode: z.number() }),
]);

export type GenerateWordDistractionsInput = z.infer<typeof generateWordDistractionsInput>;
export type GenerateWordDistractionsOutput = z.infer<typeof generateWordDistractionsOutput>;

// --- 多语言单词意思 ---
export const generateMultilingualMeaningInput = z.object({
  word: z.string().min(1),
  meaning: z.union([z.string(), z.record(z.string(), z.any())]),
});

export const generateMultilingualMeaningOutput = z.union([
  z.object({
    errorCode: z.null(),
    zh: z.string(),
    en: z.string(),
    'zh-TW': z.string(),
  }),
  z.object({ errorCode: z.number() }),
]);

export type GenerateMultilingualMeaningInput = z.infer<typeof generateMultilingualMeaningInput>;
export type GenerateMultilingualMeaningOutput = z.infer<typeof generateMultilingualMeaningOutput>;

// --- 问题多语言翻译 ---
export const translateQuestionInput = z.object({
  questionText: z.string(),
  sourceLang: z.enum(['zh', 'en', 'zh-TW']).default('zh'),
});

export const translateQuestionOutput = z.union([
  z.object({
    errorCode: z.null(),
    question: z.object({
      zh: z.string(),
      en: z.string(),
      'zh-TW': z.string(),
    }),
  }),
  z.object({ errorCode: z.number() }),
]);

export type TranslateQuestionInput = z.infer<typeof translateQuestionInput>;
export type TranslateQuestionOutput = z.infer<typeof translateQuestionOutput>;

// --- 流式 AI Chat ---
export const streamChatInput = z.object({
  prompt: z.string().min(1, 'Prompt 不能为空'),
  model: z.enum(['gpt-4o', 'gpt-4o-mini']).default('gpt-4o-mini'),
});

export type StreamChatInput = z.infer<typeof streamChatInput>;

/**
 * 流式 Chat 返回的 chunk 类型
 * - delta: 增量文本
 * - done: 流结束标记
 * - errorCode: 错误码（rate limit 等）
 */
export type StreamChatChunk =
  | { type: 'delta'; content: string }
  | { type: 'done' }
  | { type: 'error'; errorCode: number };
