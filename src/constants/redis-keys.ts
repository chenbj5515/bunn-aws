/**
 * Redis key常量定义
 * 集中管理所有Redis key的命名规则
 */

// 订阅用户相关的key
export const SUBSCRIPTION_KEYS = {
  // 基础token计数
  tokens: (userId: string) => `user:${userId}:subscription:tokens`,
  tokensInput: (userId: string) => `user:${userId}:subscription:tokens:input`,
  tokensOutput: (userId: string) => `user:${userId}:subscription:tokens:output`,

  // 按模型分类token计数
  modelTokens: {
    gpt4o: {
      total: (userId: string) => `user:${userId}:subscription:tokens:gpt-4o:total`,
      input: (userId: string) => `user:${userId}:subscription:tokens:gpt-4o:input`,
      output: (userId: string) => `user:${userId}:subscription:tokens:gpt-4o:output`,
    },
    gpt4oMini: {
      total: (userId: string) => `user:${userId}:subscription:tokens:gpt-4o-mini:total`,
      input: (userId: string) => `user:${userId}:subscription:tokens:gpt-4o-mini:input`,
      output: (userId: string) => `user:${userId}:subscription:tokens:gpt-4o-mini:output`,
    },
  },

  // 费用计数（microUSD）
  costs: {
    total: (userId: string) => `user:${userId}:subscription:cost_micro:total`,
    openaiTotal: (userId: string) => `user:${userId}:subscription:cost_micro:openai_total`,
    minimaxTts: (userId: string) => `user:${userId}:subscription:cost_micro:minimax_tts`,
    vercelBlob: (userId: string) => `user:${userId}:subscription:cost_micro:vercel_blob`,
  },

  // 批量操作前缀（仅用于扫描删除，不用于直接读写值）
  prefixes: {
    all: (userId: string) => `user:${userId}:subscription:*`,
    tokens: (userId: string) => `user:${userId}:subscription:tokens*`,
    costs: (userId: string) => `user:${userId}:subscription:cost_micro:*`,
  },
};

// 免费用户相关的key
export const FREE_KEYS = {
  // 免费用户每日成本（microUSD）分项
  costs: {
    total: (userId: string, date: string) => `token:${userId}:${date}:cost_micro:total`,
    openaiTotal: (userId: string, date: string) => `token:${userId}:${date}:cost_micro:openai_total`,
    minimaxTts: (userId: string, date: string) => `token:${userId}:${date}:cost_micro:minimax_tts`,
    vercelBlob: (userId: string, date: string) => `token:${userId}:${date}:cost_micro:vercel_blob`,
  },

  // 随机卡片功能使用次数限制（保留）
  randomCards: (userId: string, date: string) => `random-cards:${userId}:${date}:count`,

  // 批量操作前缀（仅用于扫描删除，不用于直接读写值）
  prefixes: {
    costs: (userId: string) => `token:${userId}:*:cost_micro:*`,
    randomCards: (userId: string) => `random-cards:${userId}:*`,
  },
};

// 用户相关的key
export const USER_KEYS = {
  settings: (userId: string) => `user:${userId}:settings`,
  subscriptionActive: (userId: string) => `user:${userId}:subscription:active`,
  dislikedVideos: (userId: string) => `user:${userId}:safari:disliked_videos`,
};

// 其他key
export const OTHER_KEYS = {
  // 复习状态
  reviewMemoCard: (userId: string, date: string) => `review:${userId}:${date}:memoCard`,
  reviewWordCard: (userId: string, date: string) => `review:${userId}:${date}:wordCard`,

  // 会话管理
  activeSessions: (userId: string) => `active-sessions-${userId}`,

  // Key前缀（用于批量操作）
  tokenPrefix: (userId: string) => `token:${userId}:*`,
  userPrefix: (userId: string) => `user:${userId}:*`,
};

// 为了向后兼容，保留旧的导出名称
export const USER_SETTINGS_KEY = USER_KEYS.settings;
export const USER_SUBSCRIPTION_ACTIVE_KEY = USER_KEYS.subscriptionActive;
export const REVIEW_MEMO_CARD_KEY = OTHER_KEYS.reviewMemoCard;
export const REVIEW_WORD_CARD_KEY = OTHER_KEYS.reviewWordCard;
export const FREE_DAILY_COST_MICRO_KEY = FREE_KEYS.costs.total;
export const USER_SUBSCRIPTION_TOKENS_INPUT_KEY = SUBSCRIPTION_KEYS.tokensInput;
export const USER_SUBSCRIPTION_TOKENS_OUTPUT_KEY = SUBSCRIPTION_KEYS.tokensOutput;
export const RANDOM_CARDS_DAILY_COUNT_KEY = FREE_KEYS.randomCards;
export const USER_DISLIKED_VIDEOS_KEY = USER_KEYS.dislikedVideos;
export const TOKEN_KEY_PREFIX = OTHER_KEYS.tokenPrefix;
export const USER_KEY_PREFIX = OTHER_KEYS.userPrefix;
export const RANDOM_CARDS_KEY_PREFIX = FREE_KEYS.prefixes.randomCards;
export const ACTIVE_SESSIONS_KEY = OTHER_KEYS.activeSessions;
