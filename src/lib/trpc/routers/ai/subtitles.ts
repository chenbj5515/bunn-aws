/**
 * 字幕提取 - tRPC Procedure
 */

import { after } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { rateLimitedProcedure } from '../../procedures';
import { getSubtitlesPrompt, processSubtitlesContent, subtitleKindToErrorCode } from '@/prompts';
import { extractSubtitlesInput, extractSubtitlesOutput } from './type';
import { trackUsage } from '@/lib/auth/billing';
import { ERROR_CODES } from '@/server/constants';

const PERF_LOG_PREFIX = '[ExtractSubtitles-Perf]';

export const extractSubtitles = rateLimitedProcedure
  .input(extractSubtitlesInput)
  .output(extractSubtitlesOutput)
  .mutation(async ({ input, ctx }) => {
    const totalStart = performance.now();
    console.log(`${PERF_LOG_PREFIX} 服务端处理开始 (base64长度: ${input.imageBase64.length})`);
    
    if (ctx.rateLimited) {
      console.log(`${PERF_LOG_PREFIX} 被限流，直接返回`);
      return { errorCode: ERROR_CODES.TOKEN_LIMIT_EXCEEDED };
    }

    const { imageBase64 } = input;

    const aiStart = performance.now();
    console.log(`${PERF_LOG_PREFIX} generateText (gpt-4o) 调用开始`);
    
    const { text, usage } = await generateText({
      model: openai('gpt-4o'),
      messages: [{
        role: 'user',
        content: [
          { type: 'text' as const, text: getSubtitlesPrompt() },
          { type: 'image' as const, image: `data:image/jpeg;base64,${imageBase64}` },
        ],
      }],
    });
    
    const aiEnd = performance.now();
    console.log(`${PERF_LOG_PREFIX} generateText (gpt-4o) 调用完成 - 耗时: ${(aiEnd - aiStart).toFixed(2)}ms`);
    console.log(`${PERF_LOG_PREFIX} Token 使用: input=${usage.inputTokens}, output=${usage.outputTokens}`);

    after(() => trackUsage({
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      model: 'gpt-4o',
    }));

    const processStart = performance.now();
    const processed = processSubtitlesContent(text);
    console.log(`${PERF_LOG_PREFIX} processSubtitlesContent 耗时: ${(performance.now() - processStart).toFixed(2)}ms`);
    console.log(`${PERF_LOG_PREFIX} 服务端处理总耗时: ${(performance.now() - totalStart).toFixed(2)}ms`);
    
    if (processed.ok) return { errorCode: null, subtitles: processed.subtitles };
    return { errorCode: subtitleKindToErrorCode(processed.kind) };
  });
