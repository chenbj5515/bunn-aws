/**
 * 记忆卡片 AI 处理 - tRPC Procedure
 * 
 * 新流程：单次 AI 调用完成分词、Ruby 注音和词汇翻译
 */

import { after } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { rateLimitedProcedure } from '../../procedures';
import {
  getTranslationPrompt,
  getSegmentationPrompt,
  processTranslationContent,
  processSegmentationContent,
} from '@/prompts';
import { trackUsage } from '@/lib/auth/billing';
import { translateAndSegmentInput, translateAndSegmentOutput } from './type';
import { ERROR_CODES } from '@/server/constants';

const SEGMENTATION_MODEL = 'gpt-4o';
const TRANSLATION_MODEL = 'gpt-4o-mini';

export const translateAndSegment = rateLimitedProcedure
  .input(translateAndSegmentInput)
  .output(translateAndSegmentOutput)
  .mutation(async ({ input, ctx }) => {
    if (ctx.rateLimited) return { errorCode: ERROR_CODES.TOKEN_LIMIT_EXCEEDED };

    const { text, fallbackLocale } = input;

    // 并行调用：整句翻译 + 分词分析（包含 Ruby 和词汇翻译）
    const [translationResult, segmentationResult] = await Promise.all([
      generateText({
        model: openai(TRANSLATION_MODEL),
        messages: [{ role: 'user', content: getTranslationPrompt(text) }],
        temperature: 0.7,
      }),
      generateText({
        model: openai(SEGMENTATION_MODEL),
        messages: [{ role: 'user', content: getSegmentationPrompt(text) }],
        temperature: 0.7,
      }),
    ]);

    const translation = processTranslationContent(translationResult.text, fallbackLocale);
    const wordSegmentation = processSegmentationContent(segmentationResult.text, SEGMENTATION_MODEL);

    if (!wordSegmentation) {
      return { errorCode: ERROR_CODES.AI_PROCESSING_FAILED };
    }

    after(() => {
      trackUsage({
        inputTokens: (translationResult.usage.inputTokens ?? 0) + (segmentationResult.usage.inputTokens ?? 0),
        outputTokens: (translationResult.usage.outputTokens ?? 0) + (segmentationResult.usage.outputTokens ?? 0),
        model: SEGMENTATION_MODEL,
      });
    });

    return {
      errorCode: null,
      translation: translation as Record<string, string>,
      wordSegmentation,
    };
  });
