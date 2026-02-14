/**
 * 问题多语言翻译 - tRPC Procedure
 */

import { after } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { rateLimitedProcedure } from '../../procedures';
import { translateQuestionInput, translateQuestionOutput } from './type';
import { trackUsage } from '@/lib/auth/billing';
import { ERROR_CODES } from '@/server/constants';

export const translateQuestion = rateLimitedProcedure
  .input(translateQuestionInput)
  .output(translateQuestionOutput)
  .mutation(async ({ input, ctx }) => {
    if (ctx.rateLimited) return { errorCode: ERROR_CODES.TOKEN_LIMIT_EXCEEDED };

    const { questionText, sourceLang } = input;
    const targetLangs = sourceLang === 'zh' ? ['en', 'zh-TW'] : sourceLang === 'en' ? ['zh', 'zh-TW'] : ['zh', 'en'];
    const langName = (l: string) => (l === 'zh' ? '简体中文' : l === 'en' ? '英文' : '繁体中文');
    const fromName = sourceLang === 'zh' ? '中文' : sourceLang === 'en' ? '英文' : '繁体中文';

    const prompt = `请将以下${fromName}问题翻译成${langName(targetLangs[0]!)}和${langName(targetLangs[1]!)}，严格返回JSON：

${questionText}

注意：「」内的内容请保持原样，不要翻译，直接保留。

【返回JSON模板，勿添加多余文字】
{
  "${targetLangs[0]}": "...",
  "${targetLangs[1]}": "..."
}`;

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    after(() => trackUsage({
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      model: 'gpt-4o-mini',
    }));

    const rawText = (result.text || '').trim();
    let parsed: Record<string, string> = {};
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      return { errorCode: ERROR_CODES.TRANSLATE_QUESTION_PARSE_FAILED };
    }

    return {
      errorCode: null,
      question: {
        zh: sourceLang === 'zh' ? questionText : parsed.zh || questionText,
        en: sourceLang === 'en' ? questionText : parsed.en || questionText,
        'zh-TW': sourceLang === 'zh-TW' ? questionText : parsed['zh-TW'] || questionText,
      },
    };
  });
