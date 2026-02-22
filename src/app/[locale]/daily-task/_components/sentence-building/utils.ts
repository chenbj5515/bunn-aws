'use client';

import type { WordSegment } from '@/types/extended-memo-card';

// ============================================
// 工具函数
// ============================================

/**
 * 打乱数组顺序（Fisher-Yates 洗牌算法）
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/** 标点符号（日文 + 英文），用于比较时去掉；不含全角数字/字母，避免误删「３００人」等 */
const PUNCTUATION_REGEX =
  /[\s\u3000\u3001\u3002\u3008-\u3011\u3014\u3015\u3030\u303d\u30fb\u0020-\u002f\u003a-\u0040\u005b-\u0060\u007b-\u007e\uff01-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff65\u2000-\u206f、。．，！？：；''""（）［］｛｝〈〉《》「」『』【】〔〕・～…—－]/g;

/**
 * 规范化用于比较的字符串：Unicode 规范化、去空白、去标点
 * 避免因全角/半角标点、空格、Unicode 形式等导致正确顺序被误判为错
 */
function normalizeForCompare(s: string): string {
  return (
    s
      // Unicode 规范化（NFC），统一相同字符的不同编码形式
      .normalize('NFC')
      // 去掉空白和标点后再比较（保留全角数字如「３００」、假名、汉字等）
      .replace(PUNCTUATION_REGEX, '')
  );
}

/**
 * 检查选中的片段顺序是否正确
 * @param selectedIds 选中的片段 ID 列表（用户排列的顺序）
 * @param segments 所有片段列表
 * @param originalText 原文
 * 比较时会对双方做：Unicode 规范化、去空白、去标点后再比较，减少误判
 */
export function checkCorrectOrder(
  selectedIds: string[],
  segments: WordSegment[],
  originalText: string
): boolean {
  if (selectedIds.length !== segments.length) {
    return false;
  }

  // 根据选中顺序拼接文本
  const selectedText = selectedIds
    .map((id) => segments.find((s) => s.id === id)?.text || '')
    .join('');

  const cleanedOriginal = normalizeForCompare(originalText);
  const cleanedSelected = normalizeForCompare(selectedText);

  return cleanedOriginal === cleanedSelected;
}
