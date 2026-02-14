/**
 * AI Router - AI 内容处理
 */

import { router } from '../../init';
import { extractSubtitles } from './subtitles';
import { translateAndRuby } from './memo-card';
import { generateWordDistractions } from './word-distractions';
import { generateMultilingualMeaning } from './multilingual-meaning';
import { translateQuestion } from './translate-question';
import { streamChat } from './stream-chat';

export const aiRouter = router({
  extractSubtitles,
  translateAndRuby,
  generateWordDistractions,
  generateMultilingualMeaning,
  translateQuestion,
  streamChat,
});

export type AiRouter = typeof aiRouter;
