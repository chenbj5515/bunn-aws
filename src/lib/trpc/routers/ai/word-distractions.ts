/**
 * 单词干扰项生成 - tRPC Procedure
 *
 * 统一入口：所有 AI 调用必须经 tRPC，此处为唯一合法调用点
 */

import { after } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { rateLimitedProcedure } from '../../procedures';
import { generateWordDistractionsInput, generateWordDistractionsOutput } from './type';
import { trackUsage } from '@/lib/auth/billing';
import { isKanaOnly, containsKanji, isValidKanaPronunciation } from '@/lib/word-distractions';
import {
  parsePronunciationResponse,
  makeAlternativeDistractor,
} from '@/lib/word-distractions';
import {
  MEANING_DISTRACTIONS_SYSTEM,
  getMeaningDistractionsPrompt,
  getPronunciationDistractionsSystemPrompt,
  getPronunciationDistractionsPrompt,
} from '@/prompts/word-distractions';
import { ERROR_CODES } from '@/server/constants';

const KANA_REGEX = /[\u3040-\u309F\u30A0-\u30FF\u30FC\u3099\u309A]+/g;

function extractJson(text: string): string {
  let s = text.trim().replace(/^```json?\s*/gi, '').replace(/^```\s*/gi, '').replace(/\s*```$/gi, '');
  if (!s.startsWith('{') && s.includes('{')) {
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}') + 1;
    if (start !== -1 && end > start) s = s.slice(start, end);
  }
  return s;
}

function extractDistractions(response: string, correct: string): string[] {
  let list = parsePronunciationResponse(response);
  if (list.length < 2) {
    const kanaOnly = response.match(KANA_REGEX)?.filter((k) => k !== correct && k.length > 0).slice(0, 2);
    if (kanaOnly?.length === 2) list = kanaOnly;
  }
  return list;
}

function ensureTwoValid(candidates: string[], correct: string): string[] | null {
  const valid = candidates.filter((d) => isValidKanaPronunciation(d) && d !== correct);
  if (valid.length === 2) return valid;
  if (valid.length === 1) {
    const alt = makeAlternativeDistractor(correct, valid[0]!);
    if (alt) return [valid[0], alt];
  }
  return null;
}

export const generateWordDistractions = rateLimitedProcedure
  .input(generateWordDistractionsInput)
  .output(generateWordDistractionsOutput)
  .mutation(async ({ input, ctx }) => {
    if (ctx.rateLimited) return { errorCode: ERROR_CODES.TOKEN_LIMIT_EXCEEDED };

    const word = input;
    const zhMeaning = word.meaning.zh || word.meaning.en || Object.values(word.meaning)[0] || '未知意思';
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    const meaningResult = await generateText({
      model: openai('gpt-4o'),
      messages: [
        { role: 'system', content: MEANING_DISTRACTIONS_SYSTEM },
        { role: 'user', content: getMeaningDistractionsPrompt({ word: word.word, zhMeaning }) },
      ],
      temperature: 0.4,
      maxOutputTokens: 200,
    });
    totalInputTokens += meaningResult.usage?.inputTokens ?? 0;
    totalOutputTokens += meaningResult.usage?.outputTokens ?? 0;

    let meaningData: { zh?: string[]; en?: string[] };
    try {
      meaningData = JSON.parse(extractJson(meaningResult.text));
    } catch {
      return { errorCode: ERROR_CODES.WORD_DISTRACTIONS_MEANING_FORMAT_INVALID };
    }

    if (meaningData.zh?.length !== 2 || meaningData.en?.length !== 2) {
      return { errorCode: ERROR_CODES.WORD_DISTRACTIONS_MEANING_FORMAT_INVALID };
    }
    const meaningDistractions = { zh: meaningData.zh!, en: meaningData.en! };
    let pronunciationDistractions: string[] = [];

    // 纯假名的话，用户直到知道正确的答案了，所以不需要生成干扰项
    if (!isKanaOnly(word.word)) {
      const pronunciationBase = word.kanaPronunciation;
      if (pronunciationBase && isValidKanaPronunciation(pronunciationBase)) {
        const pronResult = await generateText({
          model: openai('gpt-4o'),
          messages: [
            { role: 'system', content: getPronunciationDistractionsSystemPrompt(pronunciationBase) },
            { role: 'user', content: getPronunciationDistractionsPrompt({ word: word.word, zhMeaning, correctPronunciation: pronunciationBase }) },
          ],
          temperature: 0.6,
          maxOutputTokens: 200,
        });
        totalInputTokens += pronResult.usage?.inputTokens ?? 0;
        totalOutputTokens += pronResult.usage?.outputTokens ?? 0;
        const distractions = extractDistractions(pronResult.text.trim(), pronunciationBase);
        const valid = ensureTwoValid(distractions, pronunciationBase);
        if (!valid) return { errorCode: ERROR_CODES.WORD_DISTRACTIONS_PRONUNCIATION_FORMAT_INVALID };
        pronunciationDistractions = valid;
      }
    }

    after(() => trackUsage({
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      model: 'gpt-4o',
    }));

    return {
      errorCode: null,
      meaningDistractions,
      pronunciationDistractions,
    };
  });