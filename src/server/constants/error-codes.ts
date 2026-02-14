/**
 * 业务错误码
 *
 * 分层设计：
 * - 1xxx: 认证
 * - 2xxx: 输入
 * - 3xxx: 限制 + AI Router 专属
 *   - 3001: 全局限流
 *   - 31xx: extractSubtitles
 *   - 32xx: translateAndRuby
 *   - 33xx: generateWordDistractions
 *   - 34xx: generateMultilingualMeaning
 *   - 35xx: translateQuestion
 * - 4xxx: API
 * - 5xxx: 服务器
 */
export const ERROR_CODES = {
  // 认证相关 (1xxx)
  UNAUTHORIZED: 1001,

  // 输入相关 (2xxx)
  INVALID_REQUEST_BODY: 2001,
  MISSING_PARAMETERS: 2002,

  // 限制相关 (3xxx)
  TOKEN_LIMIT_EXCEEDED: 3001,

  // AI: extractSubtitles (31xx)
  SUBTITLES_PARSE_FAILED: 3101,
  SUBTITLES_FORMAT_INVALID: 3102,
  SUBTITLES_NO_CONTENT: 3103,
  SUBTITLES_TOO_LONG: 3104,

  // AI: translateAndRuby (32xx)
  TRANSLATE_RUBY_PARSE_FAILED: 3201,

  // AI: generateWordDistractions (33xx)
  WORD_DISTRACTIONS_MEANING_FORMAT_INVALID: 3301,
  WORD_DISTRACTIONS_PRONUNCIATION_FORMAT_INVALID: 3302,

  // AI: generateMultilingualMeaning (34xx)
  MULTILINGUAL_MEANING_INVALID_INPUT: 3401,
  MULTILINGUAL_MEANING_PARSE_FAILED: 3402,

  // AI: translateQuestion (35xx)
  TRANSLATE_QUESTION_PARSE_FAILED: 3501,

  // API 相关 (4xxx)
  API_KEY_MISSING: 4001,
  API_ERROR: 4002,
  EXTERNAL_API_ERROR: 4004,

  // 服务器错误 (5xxx)
  INTERNAL_SERVER_ERROR: 5001,
} as const;