/** 工具函数：假名/汉字检测与校验 */

/** 判断是否纯假名（ひらがな、カタカナ、促音等），不含汉字 */
export function isKanaOnly(word: string): boolean {
  const kanaRegex = /^[\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9F\u30FC\u3099\u309A\s]*$/;
  return kanaRegex.test(word);
}

/** 判断是否为有效假名发音（含假名、不含中文说明） */
export function isValidKanaPronunciation(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const kanaRegex = /[\u3040-\u309F\u30A0-\u30FF\u30FC\u3099\u309A]/;
  const noChineseRegex = /[\u4e00-\u9fff]/;
  return kanaRegex.test(trimmed) && !noChineseRegex.test(trimmed);
}

/** 判断是否包含汉字（用于决定是否需要生成读音） */
export function containsKanji(text: string): boolean {
  return /[\u4e00-\u9faf]/.test(text);
}
