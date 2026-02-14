'use client';

import { AchievementBadge } from './achievement-badge';
import { getCurrentBadgeLevel } from '@/constants/badge-levels';

export interface UserBadgeProps {
  achievementPoints: number;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showAnimation?: boolean;
  onClick?: () => void;
}

export function UserBadge({ 
  achievementPoints, 
  className,
  size = 'sm',
  showAnimation = false,
  onClick
}: UserBadgeProps) {
  // 获取当前徽章等级
  const currentBadge = getCurrentBadgeLevel(achievementPoints);
  
  return (
    <div 
      className={className}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <AchievementBadge
        level={currentBadge.id as any}
        size={size}
        showAnimation={showAnimation}
        className="hover:scale-110 transition-transform duration-300"
      />
    </div>
  );
}
