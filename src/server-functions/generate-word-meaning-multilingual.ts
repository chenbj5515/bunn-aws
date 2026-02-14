'use server';

import { db } from '@/lib/db';
import { wordCard, memoCard } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { isNull, eq, and } from 'drizzle-orm';
import { getServerTrpc } from '@/lib/trpc/server';

export interface WordMeaningMultilingualResult {
  word: string;
  originalMeaning: any;
  generatedMultilingualMeaning: {
    zh: string;
    en: string;
    'zh-TW': string;
  } | null;
}

export interface GenerateMultilingualOptions {
  onProgress?: (current: number, total: number) => void;
  onWordStart?: (word: string, index: number, total: number) => void;
  onWordComplete?: (word: string, success: boolean, result?: WordMeaningMultilingualResult) => void;
}

export interface GenerateMultilingualResult {
  success: boolean;
  processedCount: number;
  skippedCount: number;
  errorCount: number;
  error?: string;
}

/**
 * 生成单词的多语言意思版本
 */
export async function generateWordMeaningMultilingual(
  options: GenerateMultilingualOptions = {}
): Promise<GenerateMultilingualResult> {
  try {
    // 验证用户认证
    const session = await getSession();
    if (!session?.user) {
      return {
        success: false,
        processedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        error: '用户未登录'
      };
    }

    // 查询需要处理的单词：只处理来源于YouTube的记忆卡片（通过memoCard.platform确认）且meaning_new字段为null的单词
    const wordsToProcess = await db
      .select({
        id: wordCard.id,
        word: wordCard.word,
        kanaPronunciation: wordCard.kanaPronunciation,
        meaning: wordCard.meaning,
        meaning_new: wordCard.meaning_new,
        createTime: wordCard.createTime,
        memoCardId: wordCard.memoCardId
      })
      .from(wordCard)
      .innerJoin(memoCard, eq(wordCard.memoCardId, memoCard.id))
      .where(
        and(
          isNull(wordCard.meaning_new),
          eq(memoCard.platform, 'youtube')
        )
      )
      .orderBy(wordCard.createTime);

    const totalWords = wordsToProcess.length;
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    if (totalWords === 0) {
      return {
        success: true,
        processedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        error: '没有需要处理的单词'
      };
    }

    // 批量处理单词
    for (let i = 0; i < wordsToProcess.length; i++) {
      const word = wordsToProcess[i];

      if (!word) {
        continue;
      }

      try {
        // 发送开始处理单词的回调
        options.onWordStart?.(word.word, i + 1, totalWords);

        // 调用进度回调
        options.onProgress?.(i + 1, totalWords);

        // 生成多语言版本
        const multilingualMeaning = await generateMultilingualMeaningForWord(word);

        // 构建结果对象
        const wordResult: WordMeaningMultilingualResult = {
          word: word.word,
          originalMeaning: word.meaning,
          generatedMultilingualMeaning: multilingualMeaning
        };

        if (multilingualMeaning) {
          // 更新数据库
          await db.update(wordCard)
            .set({
              meaning_new: multilingualMeaning
            })
            .where(eq(wordCard.id, word.id));

          processedCount++;
          // 发送成功完成回调，包含生成结果
          options.onWordComplete?.(word.word, true, wordResult);
        } else {
          errorCount++;
          // 发送失败完成回调，包含结果（null表示失败）
          options.onWordComplete?.(word.word, false, wordResult);
        }

        // 添加延迟避免API限制
        if (i < wordsToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        errorCount++;
        // 构建错误结果对象
        const errorResult: WordMeaningMultilingualResult = {
          word: word.word,
          originalMeaning: word.meaning,
          generatedMultilingualMeaning: null
        };
        // 发送失败完成回调，包含错误信息
        const errorMessage = error instanceof Error ? error.message : String(error);
        options.onWordComplete?.(`${word.word} (错误: ${errorMessage})`, false, errorResult);
      }
    }

    return {
      success: true,
      processedCount,
      skippedCount,
      errorCount
    };

  } catch (error) {
    return {
      success: false,
      processedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/** 为单个单词生成多语言意思版本（经 tRPC 调用 AI） */
export async function generateMultilingualMeaningForWord(word: {
  word: string;
  meaning: any;
}): Promise<{ zh: string; en: string; 'zh-TW': string } | null> {
  const trpc = await getServerTrpc();
  const result = await trpc.ai.generateMultilingualMeaning({ word: word.word, meaning: word.meaning });
  if (result.errorCode !== null) return null;
  return { zh: result.zh, en: result.en, 'zh-TW': result['zh-TW'] };
}
