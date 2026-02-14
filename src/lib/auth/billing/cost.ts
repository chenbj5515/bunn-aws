import { countTokens as gptCountTokens } from 'gpt-tokenizer';
import {
  estimateOpenAICostMicroUSD,
  estimateMiniMaxTTSCostMicroUSD,
  estimateVercelBlobStorageCostMicroUSD,
} from '@/lib/auth/billing/helpers';

export type ModelType = 'gpt-4o' | 'gpt-4o-mini' | string;

/**
 * 计算文本的 token 数量
 */
export function countTokens(text: string): number {
  try {
    return gptCountTokens(text);
  } catch {
    return Math.ceil(text.length / 4);
  }
}

export type CostMeta = {
  provider?: 'openai' | 'minimax' | 'blob';
  chars?: number;
  bytes?: number;
};

/**
 * 计算各 provider 的费用（microUSD）
 */
export function calculateCostMicros(params: {
  model: ModelType;
  inputTokens: number;
  outputTokens: number;
  costMeta?: CostMeta;
}) {
  const { model, inputTokens, outputTokens, costMeta } = params;

  const openaiMicro = Number(estimateOpenAICostMicroUSD({ model, inputTokens, outputTokens }));
  const minimaxMicro = costMeta?.provider === 'minimax' && costMeta.chars
    ? Number(estimateMiniMaxTTSCostMicroUSD({ chars: costMeta.chars }))
    : 0;
  const blobMicro = costMeta?.provider === 'blob' && costMeta.bytes
    ? Number(estimateVercelBlobStorageCostMicroUSD({ bytes: costMeta.bytes }))
    : 0;

  return {
    openaiMicro,
    minimaxMicro,
    blobMicro,
    totalMicro: openaiMicro + minimaxMicro + blobMicro,
  };
}
