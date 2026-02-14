import type { Question } from './reducer';
import type { wordCard } from '@/lib/db/schema';
import type { InferSelectModel } from 'drizzle-orm';
import {
  getMeaningDistractorsByLocale,
  DEFAULT_KANA_DISTRACTORS,
} from '../../_utils/constants';

// ============================================
// 类型定义
// ============================================

export type Word = InferSelectModel<typeof wordCard>;

// ============================================
// 工具函数
// ============================================

export function normalizeOptionText(text: string): string {
  if (!text) return text;

  // 对于中文，直接返回
  if (/[\u4e00-\u9fff]/.test(text)) {
    return text;
  }

  // 对于英文，将每个单词的首字母大写，其余小写
  return text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function generateQuestions(
  words: Word[],
  t: (key: string, values?: Record<string, any>) => string,
  locale: string = 'zh'
): Question[] {
  const newQuestions: Question[] = [];

  for (const word of words) {
    // 根据locale获取正确意思
    const getMeaningByLocale = (word: Word, targetLocale: string): string => {
      // 优先使用 meaning_new（多语言 JSON 格式）
      if (word.meaning_new && typeof word.meaning_new === 'object') {
        const multilingualMeaning = word.meaning_new as Record<string, string>;
        const localeMap: Record<string, string> = {
          zh: 'zh',
          en: 'en',
          'zh-TW': 'zh-TW',
        };
        const key = localeMap[targetLocale] || 'zh';
        if (multilingualMeaning[key]) {
          return multilingualMeaning[key];
        }
      }

      // 回退到 meaning 字段（纯文本）
      return word.meaning || 'Unknown meaning';
    };

    const correctMeaning = getMeaningByLocale(word, locale);

    // 生成含义问题
    const meaningQuestion: Question = {
      word: word.word,
      type: 'meaning',
      question: t('questionMeaning', { word: word.word }),
      options: [],
      correctAnswer: normalizeOptionText(correctMeaning),
    };

    // 尝试使用数据库中的意思迷惑项
    let distractors: string[] = [];

    if (word.meaningDistractions && typeof word.meaningDistractions === 'object') {
      const langKey = locale === 'en' ? 'en' : 'zh';
      const selectedDistractions = (word.meaningDistractions as Record<string, string[]>)[langKey];

      if (Array.isArray(selectedDistractions) && selectedDistractions.length > 0) {
        distractors = selectedDistractions
          .filter((m: string) => normalizeOptionText(m) !== meaningQuestion.correctAnswer)
          .slice(0, 2)
          .map(normalizeOptionText);
      }
    }

    // 如果数据库中没有足够的迷惑项，使用默认干扰项
    if (distractors.length < 2) {
      const defaultMeanings = getMeaningDistractorsByLocale(locale);

      const filteredDefaults = [...defaultMeanings]
        .filter((m) => normalizeOptionText(m) !== meaningQuestion.correctAnswer)
        .slice(0, 2 - distractors.length)
        .map(normalizeOptionText);
      distractors = [...distractors, ...filteredDefaults];
    }

    meaningQuestion.options = [...distractors, meaningQuestion.correctAnswer];
    meaningQuestion.options.sort(() => Math.random() - 0.5);

    newQuestions.push(meaningQuestion);

    // 获取假名发音
    const wordKana = word.kanaPronunciation;
    
    // 如果有假名发音，生成发音问题
    if (wordKana) {
      const pronunciationQuestion: Question = {
        word: word.word,
        type: 'pronunciation',
        question: t('questionPronunciation', { word: word.word }),
        options: [],
        correctAnswer: wordKana || 'Unknown kana',
      };

      const correctKanaNormalized = normalizeOptionText(wordKana || '');
      let kanaDistractors: string[] = [];

      // 优先使用数据库中的发音干扰项
      const pronunciationDistractionsArray = word.pronunciationDistractions as string[] | null;
      if (pronunciationDistractionsArray && Array.isArray(pronunciationDistractionsArray) && pronunciationDistractionsArray.length > 0) {
        kanaDistractors = pronunciationDistractionsArray
          .filter((k: string) => normalizeOptionText(k) !== correctKanaNormalized)
          .slice(0, 2)
          .map(normalizeOptionText);
      }

      // 如果数据库中没有足够的干扰项，从其他单词中获取
      if (kanaDistractors.length < 2) {
        const otherKanaDistractors = words
          .filter((w) => {
            const wKana = w.kanaPronunciation;
            return w.word !== word.word && wKana && normalizeOptionText(wKana) !== correctKanaNormalized && !kanaDistractors.includes(normalizeOptionText(wKana));
          })
          .map((w) => normalizeOptionText(w.kanaPronunciation))
          .slice(0, 2 - kanaDistractors.length);
        kanaDistractors = [...kanaDistractors, ...otherKanaDistractors];
      }

      // 如果干扰项仍然不足，使用默认假名干扰项
      if (kanaDistractors.length < 2) {
        const filteredDefaults = [...DEFAULT_KANA_DISTRACTORS]
          .filter((k) => normalizeOptionText(k) !== correctKanaNormalized && !kanaDistractors.includes(normalizeOptionText(k)))
          .sort(() => Math.random() - 0.5)
          .slice(0, 2 - kanaDistractors.length)
          .map(normalizeOptionText);
        kanaDistractors = [...kanaDistractors, ...filteredDefaults];
      }

      const correctKana = wordKana || 'Unknown kana';
      pronunciationQuestion.correctAnswer = normalizeOptionText(correctKana);
      pronunciationQuestion.options = [...kanaDistractors, pronunciationQuestion.correctAnswer];
      pronunciationQuestion.options.sort(() => Math.random() - 0.5);

      newQuestions.push(pronunciationQuestion);
    }
  }

  return newQuestions;
}
