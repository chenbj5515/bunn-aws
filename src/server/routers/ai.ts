/**
 * AI Router - AI 内容处理
 */

import { router } from '../trpc';

// 暂时创建空的 router，之后可以添加具体的 AI 处理函数
export const aiRouter = router({
  // extractSubtitles: extractSubtitles,
  // extractArticleSentences: extractArticleSentences,
  // extractComicDialogues: extractComicDialogues,
  // translateAndRuby: translateAndRuby,
});

export type AiRouter = typeof aiRouter;