// ============================================
// 每日任务配置常量
// ============================================

/**
 * 每次任务获取的记忆卡片数量
 */
export const MEMO_CARD_LIMIT = 1;

// ============================================
// 选择题默认干扰项常量
// ============================================

/**
 * 意思干扰项 - 英文
 * 用于生成选择题中"选含义"题型的干扰选项
 */
export const DEFAULT_MEANING_DISTRACTORS_EN = [
  'study',
  'work',
  'life',
  'time',
  'place',
  'method',
  'problem',
  'result',
  'friend',
  'family',
  'house',
  'phone',
  'food',
  'book',
] as const;

/**
 * 意思干扰项 - 中文
 * 用于生成选择题中"选含义"题型的干扰选项
 */
export const DEFAULT_MEANING_DISTRACTORS_ZH = [
  '学习',
  '工作',
  '生活',
  '时间',
  '地方',
  '方法',
  '问题',
  '结果',
  '朋友',
  '家人',
  '房子',
  '电话',
  '食物',
  '书本',
] as const;

/**
 * 假名发音干扰项
 * 用于生成选择题中"选发音"题型的干扰选项
 */
export const DEFAULT_KANA_DISTRACTORS = [
  'たべる',
  'のむ',
  'みる',
  'きく',
  'はなす',
  'よむ',
  'かく',
  'あるく',
  'はしる',
  'ねる',
  'おきる',
  'つくる',
  'あそぶ',
  'まなぶ',
] as const;

/**
 * 根据 locale 获取意思干扰项
 */
export function getMeaningDistractorsByLocale(locale: string): readonly string[] {
  return locale === 'en' ? DEFAULT_MEANING_DISTRACTORS_EN : DEFAULT_MEANING_DISTRACTORS_ZH;
}
