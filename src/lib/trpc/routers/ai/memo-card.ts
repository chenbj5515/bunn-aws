/**
 * 记忆卡片 AI 处理 - tRPC Procedure
 */

import { after } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { rateLimitedProcedure } from '../../procedures';
import {
  getTranslationPrompt,
  getRubyPrompt,
  getRubyTranslationsPrompt,
  processTranslationContent,
  processRubyContent,
  processRubyTranslationsContent,
  extractRubyItems,
} from '@/prompts';
import { trackUsage } from '@/lib/auth/billing';
import { translateAndRubyInput, translateAndRubyOutput } from './type';
import { ERROR_CODES } from '@/server/constants';

export const translateAndRuby = rateLimitedProcedure
  .input(translateAndRubyInput)
  .output(translateAndRubyOutput)
  .mutation(async ({ input, ctx }) => {
    if (ctx.rateLimited) return { errorCode: ERROR_CODES.TOKEN_LIMIT_EXCEEDED };

    const { text, fallbackLocale } = input;

    const [translationResult, rubyResult] = await Promise.all([
      generateText({
        model: openai('gpt-4o-mini'),
        messages: [{ role: 'user', content: getTranslationPrompt(text) }],
        temperature: 0.7,
      }),
      generateText({
        model: openai('gpt-4o'),
        messages: [{ role: 'user', content: getRubyPrompt(text) }],
        temperature: 0.7,
      }),
    ]);

    const translation = processTranslationContent(translationResult.text, fallbackLocale);
    const rubyHtml = processRubyContent(rubyResult.text);
    const rubyItems = extractRubyItems(rubyHtml);

    let rubyTranslations: Record<string, Record<string, string>> = {};
    let rubyTranslationsUsage = { inputTokens: 0, outputTokens: 0 };

    if (rubyItems.length > 0) {
      const rubyTranslationsResult = await generateText({
        model: openai('gpt-4o-mini'),
        messages: [{ role: 'user', content: getRubyTranslationsPrompt(text, rubyItems) }],
        temperature: 0.7,
      });
      rubyTranslations = processRubyTranslationsContent(rubyTranslationsResult.text);
      rubyTranslationsUsage = {
        inputTokens: rubyTranslationsResult.usage.inputTokens ?? 0,
        outputTokens: rubyTranslationsResult.usage.outputTokens ?? 0,
      };
    }

    after(() => {
      trackUsage({
        inputTokens: (translationResult.usage.inputTokens ?? 0) + (rubyResult.usage.inputTokens ?? 0) + rubyTranslationsUsage.inputTokens,
        outputTokens: (translationResult.usage.outputTokens ?? 0) + (rubyResult.usage.outputTokens ?? 0) + rubyTranslationsUsage.outputTokens,
        model: 'gpt-4o-mini',
      });
    });

    return {
      errorCode: null,
      translation: translation as Record<string, string>,
      rubyHtml,
      rubyTranslations,
    };
  });
