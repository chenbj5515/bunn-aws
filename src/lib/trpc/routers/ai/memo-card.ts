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
const PERF_LOG_PREFIX = '[TranslateSegment-Perf]';

export const translateAndSegment = rateLimitedProcedure
  .input(translateAndSegmentInput)
  .output(translateAndSegmentOutput)
  .mutation(async ({ input, ctx }) => {
    const totalStart = performance.now();
    console.log(`${PERF_LOG_PREFIX} 服务端处理开始 (文本长度: ${input.text.length})`);
    
    if (ctx.rateLimited) {
      console.log(`${PERF_LOG_PREFIX} 被限流，直接返回`);
      return { errorCode: ERROR_CODES.TOKEN_LIMIT_EXCEEDED };
    }

    const { text, fallbackLocale } = input;

    const aiStart = performance.now();
    console.log(`${PERF_LOG_PREFIX} 并行 AI 调用开始 (${TRANSLATION_MODEL} + ${SEGMENTATION_MODEL})`);
    
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
    
    const aiEnd = performance.now();
    console.log(`${PERF_LOG_PREFIX} 并行 AI 调用完成 - 耗时: ${(aiEnd - aiStart).toFixed(2)}ms`);
    console.log(`${PERF_LOG_PREFIX} Translation Token: input=${translationResult.usage.inputTokens}, output=${translationResult.usage.outputTokens}`);
    console.log(`${PERF_LOG_PREFIX} Segmentation Token: input=${segmentationResult.usage.inputTokens}, output=${segmentationResult.usage.outputTokens}`);

    const processStart = performance.now();
    const translation = processTranslationContent(translationResult.text, fallbackLocale);
    const wordSegmentation = processSegmentationContent(segmentationResult.text, SEGMENTATION_MODEL);
    console.log(`${PERF_LOG_PREFIX} 结果处理耗时: ${(performance.now() - processStart).toFixed(2)}ms`);

    if (!wordSegmentation) {
      console.log(`${PERF_LOG_PREFIX} 分词失败`);
      return { errorCode: ERROR_CODES.AI_PROCESSING_FAILED };
    }

    console.log(`${PERF_LOG_PREFIX} 服务端处理总耗时: ${(performance.now() - totalStart).toFixed(2)}ms`);

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
