/**
 * 流式 AI Chat - tRPC Procedure
 *
 * 使用 async generator 实现流式响应
 */

import { after } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { rateLimitedProcedure } from '../../procedures';
import { trackUsage } from '@/lib/auth/billing';
import { streamChatInput, type StreamChatChunk } from './type';
import { ERROR_CODES } from '@/server/constants';

/**
 * 简单的 token 计数（基于字符数估算）
 */
function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export const streamChat = rateLimitedProcedure
  .input(streamChatInput)
  .mutation(async function* ({ input, ctx }): AsyncGenerator<StreamChatChunk> {
    // 检查 rate limit
    if (ctx.rateLimited) {
      yield { type: 'error', errorCode: ERROR_CODES.TOKEN_LIMIT_EXCEEDED };
      return;
    }

    const { prompt, model } = input;

    try {
      // 使用 Vercel AI SDK 创建流式响应
      const result = streamText({
        model: openai(model),
        messages: [{ role: 'user', content: prompt }],
      });

      // Token 统计
      let fullResponse = '';
      const inputTokens = countTokens(prompt);
      let accountedOutputTokens = 0;
      let charsSinceLastIncrement = 0;
      const INCREMENTAL_CHAR_THRESHOLD = 400;

      // 先行入账输入 token
      try {
        trackUsage({ inputTokens, outputTokens: 0, model });
      } catch {
        /* noop */
      }

      // 流式输出
      for await (const delta of result.textStream) {
        fullResponse += delta;
        charsSinceLastIncrement += delta.length;

        yield { type: 'delta', content: delta };

        // 节流的增量入账
        if (charsSinceLastIncrement >= INCREMENTAL_CHAR_THRESHOLD) {
          const currentOutputTokens = countTokens(fullResponse);
          const deltaOutput = Math.max(0, currentOutputTokens - accountedOutputTokens);
          if (deltaOutput > 0) {
            accountedOutputTokens += deltaOutput;
            trackUsage({ inputTokens: 0, outputTokens: deltaOutput, model });
          }
          charsSinceLastIncrement = 0;
        }
      }

      // 终局校准
      const finalOutputTokens = countTokens(fullResponse);
      const finalDelta = Math.max(0, finalOutputTokens - accountedOutputTokens);
      if (finalDelta > 0) {
        after(() => trackUsage({ inputTokens: 0, outputTokens: finalDelta, model }));
      }

      yield { type: 'done' };
    } catch (error) {
      console.error('streamChat error:', error);
      yield { type: 'error', errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR };
    }
  });
