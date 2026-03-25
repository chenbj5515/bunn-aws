import { redis } from '@/lib/redis';
import { WEBHOOK_KEYS } from '@/constants/redis-keys';
import { v4 as uuidv4 } from 'uuid';

export type WebhookProcessingBranch = 
  | 'one_time_payment'
  | 'subscription'
  | 'subscription_checkout_skip'
  | 'skipped'
  | 'error'
  | 'unhandled';

export interface WebhookLogData {
  stripeEventId: string;
  eventType: string;
  userId?: string | null;
  stripeCustomerId?: string | null;
  stripeCustomerEmail?: string | null;
  processingBranch: WebhookProcessingBranch;
  success: boolean;
  errorMessage?: string | null;
  subscriptionId?: string | null;
  payload?: Record<string, unknown>;
}

export interface WebhookLogEntry extends WebhookLogData {
  id: string;
  createdAt: number;
}

export interface WebhookLogsQueryOptions {
  page?: number;
  perPage?: number;
  userId?: string;
  eventType?: string;
  branch?: WebhookProcessingBranch;
  startDate?: number;
  endDate?: number;
}

export interface WebhookLogsResult {
  logs: WebhookLogEntry[];
  total: number;
  page: number;
  perPage: number;
}

export async function logWebhook(data: WebhookLogData): Promise<string> {
  const id = uuidv4();
  const createdAt = Date.now();
  const logKey = WEBHOOK_KEYS.log(id);
  
  const logEntry: WebhookLogEntry = {
    ...data,
    id,
    createdAt,
  };

  const client = redis.rawClient;
  const pipeline = client.pipeline();

  pipeline.set(logKey, JSON.stringify(logEntry));
  pipeline.expire(logKey, WEBHOOK_KEYS.TTL_SECONDS);

  pipeline.zadd(WEBHOOK_KEYS.logs, createdAt, id);

  if (data.userId) {
    const userLogsKey = WEBHOOK_KEYS.userLogs(data.userId);
    pipeline.zadd(userLogsKey, createdAt, id);
    pipeline.expire(userLogsKey, WEBHOOK_KEYS.TTL_SECONDS);
  }

  await pipeline.exec();

  return id;
}

export async function getWebhookLogs(options: WebhookLogsQueryOptions = {}): Promise<WebhookLogsResult> {
  const {
    page = 1,
    perPage = 20,
    userId,
    eventType,
    branch,
    startDate,
    endDate,
  } = options;

  const client = redis.rawClient;
  
  let sourceKey = WEBHOOK_KEYS.logs;
  if (userId) {
    sourceKey = WEBHOOK_KEYS.userLogs(userId);
  }

  const minScore = startDate ?? '-inf';
  const maxScore = endDate ?? '+inf';

  const total = await client.zcount(sourceKey, minScore, maxScore);

  const start = (page - 1) * perPage;
  const stop = start + perPage - 1;

  const ids = await client.zrevrangebyscore(
    sourceKey,
    maxScore,
    minScore,
    'LIMIT',
    start,
    perPage
  );

  if (ids.length === 0) {
    return { logs: [], total, page, perPage };
  }

  const logKeys = ids.map(id => WEBHOOK_KEYS.log(id));
  const logDataList = await client.mget(...logKeys);

  let logs: WebhookLogEntry[] = logDataList
    .filter((data): data is string => data !== null)
    .map(data => JSON.parse(data) as WebhookLogEntry);

  if (eventType) {
    logs = logs.filter(log => log.eventType === eventType);
  }
  if (branch) {
    logs = logs.filter(log => log.processingBranch === branch);
  }

  return { logs, total, page, perPage };
}

export async function getWebhookLogById(id: string): Promise<WebhookLogEntry | null> {
  const logKey = WEBHOOK_KEYS.log(id);
  const data = await redis.get<WebhookLogEntry>(logKey);
  return data;
}

export async function cleanupExpiredLogs(): Promise<number> {
  const client = redis.rawClient;
  const cutoff = Date.now() - (WEBHOOK_KEYS.TTL_SECONDS * 1000);
  
  const expiredIds = await client.zrangebyscore(WEBHOOK_KEYS.logs, '-inf', cutoff);
  
  if (expiredIds.length === 0) {
    return 0;
  }

  const pipeline = client.pipeline();
  
  pipeline.zremrangebyscore(WEBHOOK_KEYS.logs, '-inf', cutoff);
  
  for (const id of expiredIds) {
    pipeline.del(WEBHOOK_KEYS.log(id));
  }

  await pipeline.exec();

  return expiredIds.length;
}
