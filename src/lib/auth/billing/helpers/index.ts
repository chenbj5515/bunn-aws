import { AIPricing, OpenAIModelForPricing } from '@/constants/ai-pricing';

function toMicroUSD(n: number): bigint {
    return BigInt(Math.round((n + Number.EPSILON) * 1e6));
}

export function estimateOpenAICostUSD(params: {
    model: string;
    inputTokens?: number;
    outputTokens?: number;
}): number {
    const { model } = params;
    const inputTokens = Math.max(0, Math.floor(params.inputTokens || 0));
    const outputTokens = Math.max(0, Math.floor(params.outputTokens || 0));

    const m = (AIPricing.openai as Record<string, { inputPer1K: number; outputPer1K: number }>)[model as OpenAIModelForPricing];
    if (!m) return 0;

    const inputCost = (inputTokens / 1000) * (m.inputPer1K || 0);
    const outputCost = (outputTokens / 1000) * (m.outputPer1K || 0);
    return roundUSD(inputCost + outputCost);
}

// microUSD variants (authoritative)
export function estimateOpenAICostMicroUSD(params: {
    model: string;
    inputTokens?: number;
    outputTokens?: number;
}): bigint {
    const { model } = params;
    const inputTokens = Math.max(0, Math.floor(params.inputTokens || 0));
    const outputTokens = Math.max(0, Math.floor(params.outputTokens || 0));
    const m = (AIPricing.openai as Record<string, { inputPer1K: number; outputPer1K: number }>)[model as OpenAIModelForPricing];
    if (!m) return 0n;
    const inputUsd = (inputTokens / 1000) * (m.inputPer1K || 0);
    const outputUsd = (outputTokens / 1000) * (m.outputPer1K || 0);
    return toMicroUSD(inputUsd + outputUsd);
}

export function estimateMiniMaxTTSCostUSD(params: { chars: number }): number {
    const chars = Math.max(0, Math.floor(params.chars || 0));
    const unit = AIPricing.minimax.ttsPer1KChars || 0;
    const cost = (chars / 1000) * unit;
    return roundUSD(cost);
}

export function estimateMiniMaxTTSCostMicroUSD(params: { chars: number }): bigint {
    const chars = Math.max(0, Math.floor(params.chars || 0));
    const unit = AIPricing.minimax.ttsPer1KChars || 0;
    const cost = (chars / 1000) * unit;
    return toMicroUSD(cost);
}


// Vercel Blob 费用估算（按上传图片尺寸计费，1GB = 7美元）
export function estimateVercelBlobStorageCostUSD(params: { bytes: number }): number {
    const bytes = Math.max(0, Math.floor(params.bytes || 0));
    const gb = bytes / 1_000_000_000;
    const unit = AIPricing.vercelBlob.storageUsdPerGb || 0;
    return roundUSD(gb * unit);
}

export function estimateVercelBlobStorageCostMicroUSD(params: { bytes: number }): bigint {
    const bytes = Math.max(0, Math.floor(params.bytes || 0));
    const gb = bytes / 1_000_000_000;
    const unit = AIPricing.vercelBlob.storageUsdPerGb || 0;
    return toMicroUSD(gb * unit);
}


function roundUSD(n: number): number {
    return Math.round((n + Number.EPSILON) * 1e6) / 1e6; // 保留 6 位，避免累计误差
}

/**
 * 计算距离指定时区下一个凌晨5点的秒数
 * @param timezone 时区字符串 (例如 'Asia/Shanghai', 'America/New_York')
 * @returns 距离下一个重置点的秒数
 */
export function getSecondsUntilNextDailyReset(timezone: string): number {
    const now = new Date();
    // 获取指定时区的当前时间Date对象
    const userNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

    // 创建指定时区今天凌晨5点的Date对象
    const today5am = new Date(userNow);
    today5am.setHours(5, 0, 0, 0);

    // 创建指定时区明天凌晨5点的Date对象
    const tomorrow5am = new Date(userNow);
    tomorrow5am.setDate(tomorrow5am.getDate() + 1);
    tomorrow5am.setHours(5, 0, 0, 0);

    // 确定下一个重置时间点
    // 如果指定时区当前时间 >= 今天凌晨5点，则下一个重置时间是明天凌晨5点
    // 否则，下一个重置时间是今天凌晨5点
    const nextReset = userNow.getTime() >= today5am.getTime() ? tomorrow5am : today5am;

    // 计算当前时间到下一个重置点的毫秒差，转换为秒并向上取整
    return Math.ceil((nextReset.getTime() - userNow.getTime()) / 1000);
}


/**
 * 生成用户每日Token使用量的Redis键 (基于用户时区的日期)
 * @param userId 用户ID
 * @param timezone 时区字符串
 * @returns Redis键名 (不包含具体指标，如input/output)
 */
export function getTokenUsageDayKeyBase(userId: string, timezone: string): string {
    const now = new Date();
    // 根据用户时区获取当前日期
    const userDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const dateKey = `${userDate.getFullYear()}-${String(userDate.getMonth() + 1).padStart(2, '0')}-${String(userDate.getDate()).padStart(2, '0')}`;
    return `token:${userId}:${dateKey}`;
}