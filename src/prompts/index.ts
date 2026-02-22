/**
 * Prompt 模块统一导出
 *
 * 使用方式：
 * ```ts
 * import { getSubtitlesPrompt, processSubtitlesContent } from '@/prompts';
 * ```
 */

// 字幕提取
export {
  getSubtitlesPrompt,
  processSubtitlesContent,
  subtitleKindToErrorCode,
  MAX_SUBTITLE_LENGTH,
} from './subtitles';
export type { SubtitleResult } from './subtitles';

// 记忆卡片（翻译和分词）
export {
  getTranslationPrompt,
  getSegmentationPrompt,
  processTranslationContent,
  processSegmentationContent,
} from './memo-card';
export type { TranslationResult } from './memo-card';

// 单词干扰项
export {
  CORRECT_PRONUNCIATION_SYSTEM,
  getCorrectPronunciationPrompt,
  MEANING_DISTRACTIONS_SYSTEM,
  getMeaningDistractionsPrompt,
  getPronunciationDistractionsSystemPrompt,
  getPronunciationDistractionsPrompt,
} from './word-distractions';

// 问 AI（语法分析和追问）
export {
  getGrammarAnalysisPrompt,
  getFollowUpPrompt,
  buildDialogueHistory,
  getAdditionalInstruction,
} from './ask-ai';
