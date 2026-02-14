// 从jsonb格式的translation中获取指定语言的翻译
export function getTranslationByLocale(
  translation: Record<string, string> | string,
  targetLocale: string,
  fallbackTranslation?: string
): string {
  // 如果是字符串格式（旧数据），直接返回
  if (typeof translation === 'string') {
    return translation;
  }

  // 如果不是对象，返回fallback
  if (!translation || typeof translation !== 'object') {
    return fallbackTranslation || '';
  }

  // 根据语言环境映射到translation中的key
  const localeMap: Record<string, string> = {
    'zh': 'zh',
    'zh-TW': 'zh-TW',
    'en': 'en',
    'ja': 'ja'
  };

  const key = localeMap[targetLocale] || 'zh';
  const result = translation[key];

  // 如果找到了对应语言的翻译，返回它；否则返回fallback
  return result || fallbackTranslation || '';
}
