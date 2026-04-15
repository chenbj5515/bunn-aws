import { redis } from '@/lib/redis';

const ERROR_LOG_KEY = 'app:error_logs';
const MAX_LOGS = 100;

export interface ErrorLog {
  timestamp: string;
  message: string;
  digest?: string;
  stack?: string;
  url?: string;
  context?: string;
}

export async function logError(error: unknown, meta?: { url?: string; digest?: string; context?: string }) {
  const log: ErrorLog = {
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
    digest: meta?.digest,
    url: meta?.url,
    context: meta?.context,
  };

  await redis.rawClient.lpush(ERROR_LOG_KEY, JSON.stringify(log));
  await redis.rawClient.ltrim(ERROR_LOG_KEY, 0, MAX_LOGS - 1);
}

export async function getErrorLogs(limit = 50): Promise<ErrorLog[]> {
  const logs = await redis.lrange(ERROR_LOG_KEY, 0, limit - 1);
  return logs.map(log => JSON.parse(log));
}

export async function clearErrorLogs() {
  await redis.del(ERROR_LOG_KEY);
}
