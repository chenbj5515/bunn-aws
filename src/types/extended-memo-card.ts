import { memoCard } from '@/lib/db/schema';
import type { InferSelectModel } from 'drizzle-orm';
import { z } from 'zod';

export interface Word {
    word: string;
    meaning: Record<string, string> | string;
    meaning_new?: {
        zh: string;
        en: string;
        'zh-TW': string;
    } | null;
    kanji: string | null;
    kana: string;
    meaningDistractions?: any;
}

// ============================================
// WordSegmentation 类型定义与校验 (Version 2)
// ============================================

/**
 * 词性类型
 */
export const segmentTypeSchema = z.enum([
    'noun',        // 名词
    'verb',        // 动词
    'adjective',   // 形容词
    'adverb',      // 副词
    'particle',    // 助词（は、が、を等）
    'auxiliary',   // 助动词
    'conjunction', // 接续词
    'interjection',// 感叹词
    'prefix',      // 接头词
    'suffix',      // 接尾词
    'symbol',      // 符号/标点
    'foreign',     // 外来语
    'unknown',     // 未知
]);
export type SegmentType = z.infer<typeof segmentTypeSchema>;

/**
 * 多语言翻译
 */
export const segmentTranslationsSchema = z.object({
    en: z.string(),
    zh: z.string(),
    'zh-TW': z.string(),
});
export type SegmentTranslations = z.infer<typeof segmentTranslationsSchema>;

/**
 * 单个分词片段
 */
export const segmentSchema = z.object({
    word: z.string().min(1),
    type: segmentTypeSchema,
    ruby: z.string().optional(),
    translations: segmentTranslationsSchema.optional(),
});
export type Segment = z.infer<typeof segmentSchema>;

/**
 * 元数据
 */
export const segmentationMetadataSchema = z.object({
    source: z.enum(['ai', 'manual']),
    segmentedAt: z.string(),
    model: z.string().optional(),
});
export type SegmentationMetadata = z.infer<typeof segmentationMetadataSchema>;

/**
 * wordSegmentation 字段的数据格式（Version 2）
 * 存储在数据库 memo_card.word_segmentation (jsonb)
 */
export const wordSegmentationV2Schema = z.object({
    version: z.literal(2),
    segments: z.array(segmentSchema).min(1),
    metadata: segmentationMetadataSchema,
});
export type WordSegmentationV2 = z.infer<typeof wordSegmentationV2Schema>;

/**
 * 兼容类型：可以是新版本或 null
 */
export type WordSegmentation = WordSegmentationV2 | null;

/**
 * 组件内部使用的标准化分词格式（用于 SentenceBuilding 等组件）
 */
export const wordSegmentSchema = z.object({
    id: z.string(),
    text: z.string().min(1),
    type: segmentTypeSchema,
});
export type WordSegment = z.infer<typeof wordSegmentSchema>;

export interface SentenceSegmentWithAudio extends WordSegment {
    audioDataUrl?: string | null;
}

export interface ExtendedMemoCard extends Omit<InferSelectModel<typeof memoCard>, 'translation' | 'wordSegmentation'> {
    translation: Record<string, string> | string;
    wordSegmentation: WordSegmentation;
    words: Word[];
    characterAvatarUrl?: string | null;
    channelAvatarUrl?: string | null;
    characterName?: string | null;
    wordCardCount?: number;
    questionType: string | null;
    currentContextInfo?: string;
    hasQuestionAnswerSubmission: boolean;
    lastQuestionAnswerSubmittedAt: string | null;
    avatarUrl: string | null;
    videoId: string | null;
    videoTitle: string | null;
    sentenceSegmentsWithAudio?: SentenceSegmentWithAudio[];
}