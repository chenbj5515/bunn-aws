/**
 * 记忆卡片相关 Prompt
 * 
 * 包含：
 * - 整句翻译 Prompt
 * - 分词分析 Prompt（分词 + Ruby + 词汇翻译）
 */

import type { Segment, WordSegmentationV2 } from '@/types/extended-memo-card';

/**
 * 获取整句多语言翻译 Prompt
 */
export function getTranslationPrompt(text: string): string {
  return `请将以下日文句子翻译成英文、简体中文和繁体中文，返回JSON格式：
{"en": "英文翻译", "zh": "简体中文翻译", "zh-TW": "繁體中文翻譯"}

句子: ${text}

请确保翻译准确自然。只返回 JSON，不要任何其他内容。`;
}

/**
 * 获取分词分析 Prompt（一次性完成分词、Ruby 注音、词汇翻译）
 */
export function getSegmentationPrompt(text: string): string {
  return `请对以下日语句子进行分词分析，返回JSON格式。

句子：「${text}」

要求：
1. 分词粒度要合理，保持语义完整性（如「食べられる」「していた」保持完整，不要过度拆分）
2. 每个词标注词性 type：noun/verb/adjective/adverb/particle/auxiliary/conjunction/interjection/prefix/suffix/symbol/foreign/unknown
3. 包含汉字的词添加 ruby 字段（平假名注音）
4. 外来语（カタカナ词）的 ruby 用英文原文（如 デザイン → design）
5. 对 N2 水平日语学习者值得翻译的词（尤其名词、动词）添加 translations 字段，特别常用的词可以略过
6. 助词、标点等不需要 translations

返回格式：
{
  "segments": [
    { "word": "...", "type": "..." },
    { "word": "...", "type": "...", "ruby": "..." },
    { "word": "...", "type": "...", "ruby": "...", "translations": { "en": "...", "zh": "...", "zh-TW": "..." } }
  ]
}

示例输入：「デザインシステムに則って開発を行っています。」
示例输出：
{
  "segments": [
    { "word": "デザイン", "type": "noun", "ruby": "design", "translations": { "en": "design", "zh": "设计", "zh-TW": "設計" } },
    { "word": "システム", "type": "noun", "ruby": "system", "translations": { "en": "system", "zh": "系统", "zh-TW": "系統" } },
    { "word": "に", "type": "particle" },
    { "word": "則って", "type": "verb", "ruby": "のっとって", "translations": { "en": "in accordance with", "zh": "遵循", "zh-TW": "遵循" } },
    { "word": "開発", "type": "noun", "ruby": "かいはつ", "translations": { "en": "development", "zh": "开发", "zh-TW": "開發" } },
    { "word": "を", "type": "particle" },
    { "word": "行っています", "type": "verb", "ruby": "おこなっています" },
    { "word": "。", "type": "symbol" }
  ]
}

注意：只返回JSON，不要任何其他内容。`;
}

/**
 * 翻译结果类型
 */
export interface TranslationResult {
  en?: string;
  zh?: string;
  'zh-TW'?: string;
  [key: string]: string | undefined;
}

/**
 * 处理整句翻译结果
 */
export function processTranslationContent(
  rawContent: string,
  fallbackLocale: string
): TranslationResult {
  const content = rawContent.trim();

  try {
    // 处理可能被 markdown 代码块包裹的情况
    const jsonStr = content.replace(/^```json?\s*|\s*```$/g, '').trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    // 如果无法解析为 JSON，使用原始内容作为 fallback locale 的翻译
    return { [fallbackLocale]: content };
  } catch {
    return { [fallbackLocale]: content };
  }
}

// ============================================
// 分词结果处理
// ============================================

/**
 * AI 返回的分词原始结果
 */
interface SegmentationRawResult {
  segments: Array<{
    word: string;
    type: string;
    ruby?: string;
    translations?: {
      en: string;
      zh: string;
      'zh-TW': string;
    };
  }>;
}

/**
 * 处理分词结果，转换为 WordSegmentationV2 格式
 */
export function processSegmentationContent(
  rawContent: string,
  model: string
): WordSegmentationV2 | null {
  try {
    const content = rawContent.trim();
    // 移除可能的 markdown 代码块标记
    const jsonStr = content.replace(/^```json?\s*|\s*```$/g, '').trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) return null;
    
    const rawResult: SegmentationRawResult = JSON.parse(jsonMatch[0]);
    
    if (!rawResult.segments || !Array.isArray(rawResult.segments) || rawResult.segments.length === 0) {
      return null;
    }

    // 验证并转换 segments
    const validTypes = [
      'noun', 'verb', 'adjective', 'adverb', 'particle', 'auxiliary',
      'conjunction', 'interjection', 'prefix', 'suffix', 'symbol', 'foreign', 'unknown'
    ];

    const segments: Segment[] = rawResult.segments.map(seg => {
      const type = validTypes.includes(seg.type) ? seg.type : 'unknown';
      const result: Segment = {
        word: seg.word,
        type: type as Segment['type'],
      };
      if (seg.ruby) {
        result.ruby = seg.ruby;
      }
      if (seg.translations) {
        result.translations = seg.translations;
      }
      return result;
    });

    return {
      version: 2,
      segments,
      metadata: {
        source: 'ai',
        segmentedAt: new Date().toISOString(),
        model,
      },
    };
  } catch {
    return null;
  }
}
