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

/**
 * 检查选中的片段顺序是否正确
 * @param selectedIds 选中的片段 ID 列表（用户排列的顺序）
 * @param segments 所有片段列表
 * @param originalText 原文
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

  // 清理原文（移除空格等）进行比较
  const cleanedOriginal = originalText.replace(/\s+/g, '');
  const cleanedSelected = selectedText.replace(/\s+/g, '');

  return cleanedOriginal === cleanedSelected;
}
