export interface BadgeLevel {
  id: string;        // 徽章ID
  name: string;      // 徽章名称（日文）
  nameZh: string;    // 徽章名称（中文）
  color: string;     // 徽章颜色
  minPoints: number; // 最低需要成就点数
  maxPoints: number; // 最高成就点数（超过此数进入下一级）
}

export const BADGE_LEVELS: BadgeLevel[] = [
  {
    id: "yellow",
    name: "イエロー",
    nameZh: "黄色",
    color: "#FFD700",
    minPoints: 0,
    maxPoints: 1949
  },
  {
    id: "orange",
    name: "オレンジ",
    nameZh: "橙色",
    color: "#FFA500",
    minPoints: 1950,
    maxPoints: 5849
  },
  {
    id: "green",
    name: "グリーン",
    nameZh: "绿色",
    color: "#00C853",
    minPoints: 5850,
    maxPoints: 13649
  },
  {
    id: "blue",
    name: "ブルー",
    nameZh: "蓝色",
    color: "#2979FF",
    minPoints: 13650,
    maxPoints: 27299
  },
  {
    id: "purple",
    name: "パープル",
    nameZh: "紫色",
    color: "#AA00FF",
    minPoints: 27300,
    maxPoints: 50699
  },
  {
    id: "black",
    name: "ブラック",
    nameZh: "黑色",
    color: "#212121",
    minPoints: 50700,
    maxPoints: 77999
  },
  {
    id: "volt",
    name: "ボルト",
    nameZh: "闪电",
    color: "#CCFF00",
    minPoints: 78000,
    maxPoints: Infinity
  }
];

// 根据成就点数获取当前徽章等级
export function getCurrentBadgeLevel(achievementPoints: number): BadgeLevel {
  const foundLevel = BADGE_LEVELS.find(
    level => achievementPoints >= level.minPoints && achievementPoints <= level.maxPoints
  );
  // 明确断言返回值为BadgeLevel类型
  return (foundLevel !== undefined ? foundLevel : BADGE_LEVELS[0]) as BadgeLevel;
}

// 获取下一个徽章等级
export function getNextBadgeLevel(achievementPoints: number): BadgeLevel | null {
  const currentLevel = getCurrentBadgeLevel(achievementPoints);
  const currentIndex = BADGE_LEVELS.findIndex(level => level.id === currentLevel.id);

  if (currentIndex >= 0 && currentIndex < BADGE_LEVELS.length - 1) {
    return BADGE_LEVELS[currentIndex + 1] as BadgeLevel;
  }

  return null; // 已经是最高级别
}

// 计算当前等级内的进度百分比
export function getCurrentLevelProgress(achievementPoints: number): number {
  const currentLevel = getCurrentBadgeLevel(achievementPoints);
  const totalInLevel = currentLevel.maxPoints - currentLevel.minPoints;
  const currentInLevel = achievementPoints - currentLevel.minPoints;

  return Math.min(100, Math.max(0, (currentInLevel / totalInLevel) * 100));
}

// 根据成就点数获取对应的徽章颜色
export function getBadgeColorByPoints(achievementPoints: number): string {
  const currentBadge = getCurrentBadgeLevel(achievementPoints);
  return currentBadge.color;
}
