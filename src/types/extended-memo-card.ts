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
// WordSegmentation 类型定义与校验
// ============================================

export const sentenceSegmentTypeSchema = z.enum(['word', 'phrase', 'particle', 'other']);
export type SentenceSegmentType = z.infer<typeof sentenceSegmentTypeSchema>;

/**
 * 数据库中存储的原始分词格式（来自 AI 分词）
 */
export const rawWordSegmentSchema = z.object({
    word: z.string().min(1),
    kana: z.string(),
    meaning: z.string(),
    position: z.tuple([z.number(), z.number()]),
    wordType: z.string(),
});
export type RawWordSegment = z.infer<typeof rawWordSegmentSchema>;

/**
 * wordSegmentation 字段的数据格式（数据库存储格式）
 * 存储在数据库 memo_card.word_segmentation (jsonb)
 */
export const wordSegmentationSchema = z.object({
    words: z.array(rawWordSegmentSchema).min(1),
    source: z.string().optional(),
    segmentedAt: z.string().optional(),
});
export type WordSegmentation = z.infer<typeof wordSegmentationSchema>;

/**
 * 组件内部使用的标准化分词格式
 */
export const wordSegmentSchema = z.object({
    id: z.string(),
    text: z.string().min(1),
    type: sentenceSegmentTypeSchema,
});
export type WordSegment = z.infer<typeof wordSegmentSchema>;

export interface SentenceSegmentWithAudio extends WordSegment {
    audioDataUrl?: string | null;
}

export interface ExtendedMemoCard extends Omit<InferSelectModel<typeof memoCard>, 'translation' | 'wordSegmentation'> {
    translation: Record<string, string> | string;
    wordSegmentation: WordSegmentation | null;
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