/**
 * 单词多语言意思生成 - tRPC Procedure
 */

import { after } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { rateLimitedProcedure } from '../../procedures';
import { generateMultilingualMeaningInput, generateMultilingualMeaningOutput } from './type';
import { trackUsage } from '@/lib/auth/billing';
import { ERROR_CODES } from '@/server/constants';

function extractJson(text: string): string {
  let s = text.trim().replace(/^```json\s*/gi, '').replace(/^```\s*/gi, '').replace(/\s*```$/gi, '');
  if (!s.startsWith('{') && s.includes('{')) {
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}') + 1;
    if (start !== -1 && end > start) s = s.slice(start, end);
  }
  return s;
}

export const generateMultilingualMeaning = rateLimitedProcedure
  .input(generateMultilingualMeaningInput)
  .output(generateMultilingualMeaningOutput)
  .mutation(async ({ input, ctx }) => {
    if (ctx.rateLimited) return { errorCode: ERROR_CODES.TOKEN_LIMIT_EXCEEDED };

    let originalZhMeaning = '';
    if (typeof input.meaning === 'string') {
      originalZhMeaning = input.meaning;
    } else if (input.meaning?.zh) {
      originalZhMeaning = input.meaning.zh;
    } else {
      return { errorCode: ERROR_CODES.MULTILINGUAL_MEANING_INVALID_INPUT };
    }

    const prompt = `你是专业的日语翻译专家，请为日语单词生成多语言版本的翻译。

单词: ${input.word}
原始中文意思: ${originalZhMeaning}

任务：请基于原始中文意思，为这个日语单词生成三个语言版本的翻译：
1. zh: 简体中文版本（保持原意，可以适当调整表达使其更自然）
2. en: 英文版本（准确的英文翻译）
3. zh-TW: 繁体中文版本（台湾地区常用的表达方式）

要求：翻译要准确、专业，保持原文的意思和词性

请返回JSON格式：
{
  "zh": "简体中文翻译",
  "en": "English translation",
  "zh-TW": "繁體中文翻譯"
}

只返回JSON，无其他文字。`;

    try {
      const result = await generateText({
        model: openai('gpt-4o'),
        messages: [
          { role: 'system', content: '你是专业的日语翻译专家，专门生成多语言翻译。返回标准JSON格式，无解释。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        maxOutputTokens: 300,
      });

      after(() => trackUsage({
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
        model: 'gpt-4o',
      }));

      const data = JSON.parse(extractJson(result.text));
      if (data.zh && data.en && data['zh-TW']) {
        return {
          errorCode: null,
          zh: data.zh.trim(),
          en: data.en.trim(),
          'zh-TW': data['zh-TW'].trim(),
        };
      }
      return { errorCode: ERROR_CODES.MULTILINGUAL_MEANING_PARSE_FAILED };
    } catch {
      return { errorCode: ERROR_CODES.MULTILINGUAL_MEANING_PARSE_FAILED };
    }
  });
