import type { RoundResult } from '../../_store/types';

/**
 * 计算本轮获得的积分
 * 规则：
 * - 一张卡片需要选择题和拼句子都正确才计入连对和得分
 * - 连对 N 次时，该张卡片所得分数为 N
 * - 连对被打断后，后续再次答对从 1 重新开始
 */
export function calculateGainedPoints(results: RoundResult[]): number {
  if (!results || results.length === 0) return 0;

  let total = 0;
  let streak = 0;

  for (const result of results) {
    // 必须两个都正确才算全对
    const allCorrect = result.choiceCorrect === true && result.sentenceCorrect === true;
    
    if (allCorrect) {
      streak += 1;
      total += streak;
    } else {
      // 打断连对
      streak = 0;
    }
  }

  return total;
}

/**
 * 获取最终连对数（从最后一个全对卡片向前计数）
 */
export function getFinalStreakCount(results: RoundResult[]): number {
  if (!results || results.length === 0) return 0;

  let streak = 0;
  
  // 从后往前遍历
  for (let i = results.length - 1; i >= 0; i--) {
    const result = results[i];
    if (!result) continue;
    const allCorrect = result.choiceCorrect === true && result.sentenceCorrect === true;
    
    if (allCorrect) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * 计算统计数据
 */
export function calculateStats(results: RoundResult[]): {
  totalCards: number;
  correctCards: number;
  accuracy: number;
  gainedPoints: number;
  finalStreak: number;
} {
  const totalCards = results.length;
  const correctCards = results.filter(
    r => r.choiceCorrect === true && r.sentenceCorrect === true
  ).length;
  const accuracy = totalCards > 0 ? Math.round((correctCards / totalCards) * 100) : 0;
  const gainedPoints = calculateGainedPoints(results);
  const finalStreak = getFinalStreakCount(results);

  return {
    totalCards,
    correctCards,
    accuracy,
    gainedPoints,
    finalStreak,
  };
}
