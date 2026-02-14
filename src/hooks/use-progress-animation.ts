import { useState, useEffect } from 'react';
import { getCurrentBadgeLevel, getCurrentLevelProgress } from '@/constants/badge-levels';

interface UseProgressAnimationProps {
  initialPoints: number;
  finalPoints: number;
  animationDuration?: number;
}

export function useProgressAnimation({
  initialPoints,
  finalPoints,
  animationDuration = 1500
}: UseProgressAnimationProps) {
  // 当前显示的点数
  const [displayedPoints, setDisplayedPoints] = useState(initialPoints);
  // 动画是否完成
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  
  // 初始进度
  const initialProgress = getCurrentLevelProgress(initialPoints);
  // 当前显示的进度
  const [displayedProgress, setDisplayedProgress] = useState(initialProgress);
  // 最终进度
  const finalProgress = getCurrentLevelProgress(finalPoints);
  
  // 当前徽章等级
  const currentBadge = getCurrentBadgeLevel(displayedPoints);
  
  // 处理动画
  useEffect(() => {
    if (initialPoints === finalPoints) {
      setIsAnimationComplete(true);
      return;
    }
    
    // 设置初始状态
    setDisplayedPoints(initialPoints);
    setDisplayedProgress(initialProgress);
    
    // 使用更多步骤使动画更加平滑
    const steps = 80; // 增加步骤数使动画更平滑
    const stepDuration = animationDuration / steps;
    const pointsIncrement = (finalPoints - initialPoints) / steps;
    
    let currentStep = 0;
    
    // 开始动画，适当放慢速度以便用户能察觉变化
    const animationInterval = setInterval(() => {
      currentStep++;
      
      if (currentStep >= steps) {
        // 动画完成
        setDisplayedPoints(finalPoints);
        setDisplayedProgress(finalProgress);
        setIsAnimationComplete(true);
        clearInterval(animationInterval);
      } else {
        // 更新中间状态，使用easeInOut效果使动画更自然
        // 使用缓动函数计算进度
        const progress = easeInOutQuad(currentStep / steps);
        const newPoints = initialPoints + (finalPoints - initialPoints) * progress;
        setDisplayedPoints(Math.round(newPoints));
        setDisplayedProgress(getCurrentLevelProgress(Math.round(newPoints)));
      }
    }, stepDuration);
    
    return () => clearInterval(animationInterval);
  }, [initialPoints, finalPoints, initialProgress, finalProgress, animationDuration]);
  
  // 缓动函数，使动画更加自然流畅
  function easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  
  return {
    displayedPoints,
    displayedProgress,
    isAnimationComplete,
    currentBadge,
    initialProgress
  };
}
