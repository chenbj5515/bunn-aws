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

export const extractSubtitles = rateLimitedProcedure
  .input(extractSubtitlesInput)
  .output(extractSubtitlesOutput)
  .mutation(async ({ input, ctx }) => {
    if (ctx.rateLimited) return { errorCode: ERROR_CODES.TOKEN_LIMIT_EXCEEDED };

    const { imageBase64 } = input;

    const { text, usage } = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [{
        role: 'user',
        content: [
          { type: 'text' as const, text: getSubtitlesPrompt() },
          { type: 'image' as const, image: `data:image/jpeg;base64,${imageBase64}` },
        ],
      }],
    });

    after(() => trackUsage({
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      model: 'gpt-4o-mini',
    }));

    const processed = processSubtitlesContent(text);
    if (processed.ok) return { errorCode: null, subtitles: processed.subtitles };
    return { errorCode: subtitleKindToErrorCode(processed.kind) };
  });
