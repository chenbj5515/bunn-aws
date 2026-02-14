/**
 * API 错误基类
 * 所有 HTTP API 相关错误的基类，包含状态码和可选的业务错误码
 */
export abstract class ApiError extends Error {
  abstract readonly status: number;
  readonly errorCode?: number;

  constructor(message: string, errorCode?: number) {
    super(message);
    this.errorCode = errorCode;
    // 确保 instanceof 正常工作
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** 是否为客户端错误 (4xx) */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /** 是否为服务端错误 (5xx) */
  get isServerError(): boolean {
    return this.status >= 500;
  }

  /** 是否可重试（服务端错误或限流通常可重试） */
  get isRetryable(): boolean {
    return this.status === 429 || this.status === 503 || this.status >= 500;
  }
}

// ============================================
// 4xx 客户端错误
// ============================================

/**
 * 400 Bad Request - 请求参数错误
 * 用于：参数验证失败、格式错误、缺少必填字段
 */
export class BadRequestError extends ApiError {
  readonly status = 400;
  readonly name = 'BadRequestError';
}

/**
 * 401 Unauthorized - 未认证
 * 用于：需要登录、token 过期、认证失败
 */
export class UnauthorizedError extends ApiError {
  readonly status = 401;
  readonly name = 'UnauthorizedError';
}

/**
 * 403 Forbidden - 无权限
 * 用于：已认证但无权访问、功能被禁用、会员限制
 */
export class ForbiddenError extends ApiError {
  readonly status = 403;
  readonly name = 'ForbiddenError';
}

/**
 * 404 Not Found - 资源不存在
 * 用于：找不到用户、记录、文件等资源
 */
export class NotFoundError extends ApiError {
  readonly status = 404;
  readonly name = 'NotFoundError';
}

/**
 * 409 Conflict - 资源冲突
 * 用于：DB 唯一约束冲突、乐观锁冲突、并发更新冲突
 */
export class ConflictError extends ApiError {
  readonly status = 409;
  readonly name = 'ConflictError';
}

/**
 * 429 Too Many Requests - 请求限流
 * 用于：API 调用频率限制、配额耗尽、Token 用量超限
 */
export class RateLimitError extends ApiError {
  readonly status = 429;
  readonly name = 'RateLimitError';
  // 兼容旧代码
  readonly code: string = 'RATE_LIMIT';

  constructor(message: string = '请求过于频繁，请稍后再试', errorCode?: number) {
    super(message, errorCode);
  }
}

// ============================================
// 5xx 服务端错误
// ============================================

/**
 * 500 Internal Server Error - 服务端错误
 * 用于：意外异常、代码 bug、未处理的错误
 */
export class InternalServerError extends ApiError {
  readonly status = 500;
  readonly name = 'InternalServerError';

  constructor(message: string = '服务器内部错误', errorCode?: number) {
    super(message, errorCode);
  }
}

/**
 * 503 Service Unavailable - 服务不可用
 * 用于：服务维护中、依赖服务故障、过载保护
 */
export class ServiceUnavailableError extends ApiError {
  readonly status = 503;
  readonly name = 'ServiceUnavailableError';

  constructor(message: string = '服务暂时不可用', errorCode?: number) {
    super(message, errorCode);
  }
}

// ============================================
// 工具函数
// ============================================

import { ERROR_CODES } from '@/server/constants';

/** 限流相关的 errorCode */
const RATE_LIMIT_ERROR_CODE = ERROR_CODES.TOKEN_LIMIT_EXCEEDED;

/**
 * 根据 HTTP 状态码创建对应的错误实例
 */
export function createApiError(
  status: number,
  message: string,
  errorCode?: number
): ApiError {
  switch (status) {
    case 400:
      return new BadRequestError(message, errorCode);
    case 401:
      return new UnauthorizedError(message, errorCode);
    case 403:
      // 特殊处理：errorCode 3001 表示限流
      if (errorCode === RATE_LIMIT_ERROR_CODE) {
        return new RateLimitError(message, errorCode);
      }
      return new ForbiddenError(message, errorCode);
    case 404:
      return new NotFoundError(message, errorCode);
    case 409:
      return new ConflictError(message, errorCode);
    case 429:
      return new RateLimitError(message, errorCode);
    case 503:
      return new ServiceUnavailableError(message, errorCode);
    case 500:
    default:
      // 所有 5xx 和未知状态码都归类为 InternalServerError
      return new InternalServerError(message, errorCode);
  }
}

/**
 * 从 fetch Response 创建错误
 */
export async function createErrorFromResponse(
  response: Response,
  defaultMessage: string = '请求失败'
): Promise<ApiError> {
  let body: { error?: string; errorCode?: number } | null = null;
  try {
    body = await response.json();
  } catch {
    // 无法解析 JSON，使用默认消息
  }

  const message = body?.error || defaultMessage;
  const errorCode = body?.errorCode;

  return createApiError(response.status, message, errorCode);
}

/**
 * 类型守卫：判断是否为 API 错误
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * 类型守卫：判断是否为限流错误
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof RateLimitError) return true;

  // 兼容其他错误格式
  const e = error as { name?: string; status?: number; errorCode?: number };
  return (
    e?.name === 'RateLimitError' ||
    e?.status === 429 ||
    e?.errorCode === RATE_LIMIT_ERROR_CODE
  );
}

/**
 * 类型守卫：判断是否需要用户重新登录
 */
export function isAuthError(error: unknown): boolean {
  return error instanceof UnauthorizedError;
}

/**
 * 类型守卫：判断是否可重试
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isRetryable;
  }
  return false;
}
