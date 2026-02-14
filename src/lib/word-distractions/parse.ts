/** 解析 AI 返回的发音干扰项文本 */

import { isValidKanaPronunciation } from './utils';

const CLEAN_REGEX = /[→→←↑↓↔]/g;
const NO_CHINESE = /[\u4e00-\u9fff]/;
const SPLIT_DELIM = /[,，、]/;

/** 按 AI 常见返回格式解析出原始列表（未过滤无效项） */
function parseRawList(response: string): string[] {
  if (response.includes('1.') || response.includes('2.')) {
    return response.split('\n').flatMap((line) => {
      const m = line.trim().match(/^\d+\.\s*(.+)$/);
      return m?.[1] ? [m[1].trim()] : [];
    });
  }
  if (response.includes('→')) {
    const m = response.match(/→\s*(.+)/);
    return m?.[1]?.split(SPLIT_DELIM).map((p) => p.trim()).filter(Boolean) ?? [];
  }
  if (SPLIT_DELIM.test(response)) {
    return response.split(SPLIT_DELIM).map((p) => p.trim()).filter(Boolean);
  }
  return response.split('\n').map((p) => p.trim()).filter(Boolean);
}

export function parsePronunciationResponse(response: string): string[] {
  return parseRawList(response)
    .filter((d) => {
      const cleaned = d.replace(CLEAN_REGEX, '').trim();
      return !NO_CHINESE.test(cleaned) && isValidKanaPronunciation(cleaned);
    })
    .slice(0, 2);
}

/** 兜底：仅有一个有效干扰项时，通过替换最后一个假名生成备选 */
export function makeAlternativeDistractor(correct: string, existing: string): string | null {
  const lastChar = correct[correct.length - 1];
  const replacements: Record<string, string> = {
    て: 'た', た: 'て', で: 'だ', だ: 'で', る: 'た',
  };
  const replacement = replacements[lastChar!] ?? 'ん';
  const alt = correct.slice(0, -1) + replacement;
  return alt !== correct && alt !== existing ? alt : null;
}
