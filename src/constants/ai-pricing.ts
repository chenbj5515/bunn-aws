// 统一的 AI 定价与计费配置（全部可通过 ENV 覆盖，默认值为 0 兜底）

function getNumberFromEnv(key: string, defaultValue = 0): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}

export const AIPricing = {
  openai: {
    // OpenAI 文本模型：单位为 USD / 1K tokens
    'gpt-4o': {
      // 参考官方：$5 / 1M (in) ≈ 0.005 / 1K；$15 / 1M (out) ≈ 0.015 / 1K
      inputPer1K: getNumberFromEnv('OPENAI_GPT4O_INPUT_PER_1K', 0.005),
      outputPer1K: getNumberFromEnv('OPENAI_GPT4O_OUTPUT_PER_1K', 0.015),
    },
    'gpt-4o-mini': {
      // 参考官方：$0.15 / 1M (in) ≈ 0.00015 / 1K；$0.6 / 1M (out) ≈ 0.0006 / 1K
      inputPer1K: getNumberFromEnv('OPENAI_GPT4OMINI_INPUT_PER_1K', 0.00015),
      outputPer1K: getNumberFromEnv('OPENAI_GPT4OMINI_OUTPUT_PER_1K', 0.0006),
    },
  },
  minimax: {
    // MiniMax TTS：单位为 USD / 1K characters
    // 参考价位区间（可按官方调整）：默认 0.012 / 1K 字符
    ttsPer1KChars: getNumberFromEnv('MINIMAX_TTS_PER_1K_CHARS', 0.012),
  },
  upstash: {
    // Upstash Redis：单位为 USD
    // 请求费用：USD / 1M requests（近似估算）
    requestUsdPerMillion: getNumberFromEnv('UPSTASH_REQUEST_USD_PER_MILLION', 1),
    // 存储费用：USD / GB · Month
    storageUsdPerGbMonth: getNumberFromEnv('UPSTASH_STORAGE_USD_PER_GB_MONTH', 0.25),
    // 出站流量：USD / GB
    egressUsdPerGb: getNumberFromEnv('UPSTASH_EGRESS_USD_PER_GB', 0.03),
    // 入站流量：USD / GB
    ingressUsdPerGb: getNumberFromEnv('UPSTASH_INGRESS_USD_PER_GB', 0.03),
  },
  vercelBlob: {
    // Vercel Blob：单位为 USD，按上传图片尺寸计费
    storageUsdPerGb: getNumberFromEnv('VERCEL_BLOB_STORAGE_USD_PER_GB', 7),
  },
} as const;

export type OpenAIModelForPricing = keyof typeof AIPricing['openai'];

export const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60; // 用于按 TTL 比例折算月度成本


