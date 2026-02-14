/**
 * 应用支持的语言类型
 */
export type AppLocale = 'zh' | 'en' | 'zh-TW';

/**
 * 语言常量（可用于枚举场景）
 */
export const APP_LOCALES = ['zh', 'en', 'zh-TW'] as const;

/**
 * 多语言文本类型
 */
export type LocalizedText = {
  [K in AppLocale]?: string;
};

/**
 * 必填的多语言文本类型
 */
export type RequiredLocalizedText = {
  [K in AppLocale]: string;
};
