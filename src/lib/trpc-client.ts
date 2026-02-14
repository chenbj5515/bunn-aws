import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from './trpc/routers/_app';
import {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  InternalServerError,
} from '@/lib/errors';
import { ERROR_CODES } from '../server/constants';

/**
 * tRPC 客户端 - 用于客户端组件
 */
export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      transformer: superjson,
    }),
  ],
});

/**
 * tRPC 错误码到 ApiError 的映射
 */
const TRPC_CODE_TO_STATUS: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * 将 tRPC 错误转换为类型安全的 ApiError
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof TRPCClientError) {
    const code = error.data?.code as string;
    const message = error.message;
    // errorCode 可能在 data 或 cause 中
    const errorCode = (error.data?.errorCode ?? error.data?.cause?.errorCode) as number | undefined;
    const status = TRPC_CODE_TO_STATUS[code] ?? 500;

    // 根据状态码返回对应的错误类型
    switch (status) {
      case 400:
        return new BadRequestError(message, errorCode);
      case 401:
        return new UnauthorizedError(message, errorCode);
      case 403:
        // 检查是否是限流错误
        if (errorCode === ERROR_CODES.TOKEN_LIMIT_EXCEEDED) {
          return new RateLimitError(message, errorCode);
        }
        return new ForbiddenError(message, errorCode);
      case 429:
        return new RateLimitError(message, errorCode);
      default:
        return new InternalServerError(message, errorCode);
    }
  }

  // 非 tRPC 错误
  if (error instanceof Error) {
    return new InternalServerError(error.message);
  }

  return new InternalServerError('未知错误');
}

/**
 * 类型安全的 tRPC 调用包装器
 * 自动将 tRPC 错误转换为 ApiError
 *
 * @example
 * const result = await safeTrpc(() => trpc.ai.extractSubtitles.mutate({ imageBase64: '...' }));
 * if (!result.ok) {
 *   if (result.error instanceof RateLimitError) {
 *     // 处理限流
 *   }
 * }
 */
export async function safeTrpc<T>(
  fn: () => Promise<T>
): Promise<{ ok: true; data: T } | { ok: false; error: ApiError }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toApiError(error) };
  }
}

// 导出类型供外部使用
export type { AppRouter };
