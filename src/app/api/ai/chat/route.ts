/**
 * 流式 AI Chat API Route
 *
 * 使用 Vercel AI SDK 的 streamText 实现真正的流式响应
 * 这比 tRPC mutation 更适合流式 UI 场景
 */

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { after } from 'next/server';
import { getSession } from '@/lib/auth';
import { checkLimit, trackUsage, countTokens } from '@/lib/auth/billing';
import { ERROR_CODES } from '@/server/constants';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * 请求体类型
 */
interface ChatRequest {
  prompt: string;
  model?: 'gpt-4o' | 'gpt-4o-mini';
}

/**
 * POST /api/ai/chat
 *
 * 流式 AI 对话接口
 * 返回 Server-Sent Events (SSE) 格式的流式响应
 */
export async function POST(request: Request) {
  try {
    // 1. 认证检查
    const session = await getSession();
    if (!session?.user?.id) {
      return createErrorResponse(ERROR_CODES.UNAUTHORIZED, '请先登录');
    }

    // 2. 配额检查
    const withinLimit = await checkLimit();
    if (!withinLimit) {
      return createErrorResponse(ERROR_CODES.TOKEN_LIMIT_EXCEEDED, '已达到使用限额');
    }

    // 3. 解析请求
    const body: ChatRequest = await request.json();
    const { prompt, model = 'gpt-4o-mini' } = body;

    if (!prompt?.trim()) {
      return createErrorResponse(ERROR_CODES.MISSING_PARAMETERS, 'prompt 不能为空');
    }

    // 4. 预先入账输入 token
    const inputTokens = countTokens(prompt);
    trackUsage({ inputTokens, outputTokens: 0, model });

    // 5. 创建流式响应
    const result = streamText({
      model: openai(model),
      messages: [{ role: 'user', content: prompt }],
    });

    // 6. 返回流式响应，使用 Vercel AI SDK 的 toTextStreamResponse
    const response = result.toTextStreamResponse();

    // 7. 异步追踪输出 token（在响应结束后执行）
    after(async () => {
      try {
        const fullText = await result.text;
        const outputTokens = countTokens(fullText);
        trackUsage({ inputTokens: 0, outputTokens, model });
      } catch {
        /* noop */
      }
    });

    return response;
  } catch (error) {
    console.error('AI Chat API Error:', error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_SERVER_ERROR || 5000,
      '服务器内部错误'
    );
  }
}

/**
 * 创建错误响应
 */
function createErrorResponse(errorCode: number, message: string) {
  return new Response(
    JSON.stringify({ errorCode, message }),
    {
      status: errorCode === ERROR_CODES.UNAUTHORIZED ? 401 :
              errorCode === ERROR_CODES.TOKEN_LIMIT_EXCEEDED ? 429 :
              errorCode === ERROR_CODES.MISSING_PARAMETERS ? 400 : 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
