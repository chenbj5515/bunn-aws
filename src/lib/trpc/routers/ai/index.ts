/**
 * AI Router - AI 内容处理
 *
 * 注意：流式 AI Chat 已迁移到 /api/ai/chat API Route
 * 使用 Vercel AI SDK 的原生流式响应，比 tRPC 更适合流式 UI 场景
 */

import { router } from '../../init';
import { extractSubtitles } from './subtitles';
import { translateAndRuby } from './memo-card';
import { generateWordDistractions } from './word-distractions';
import { generateMultilingualMeaning } from './multilingual-meaning';
import { translateQuestion } from './translate-question';

export const aiRouter = router({
  extractSubtitles,
  translateAndRuby,
  generateWordDistractions,
  generateMultilingualMeaning,
  translateQuestion,
});

export type AiRouter = typeof aiRouter;
