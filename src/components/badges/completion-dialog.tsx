'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { LoadingButton } from '@/components/ui/loading-button';
import { AchievementBadge } from './achievement-badge';
import { ProgressBar } from './progress-bar';
import { useProgressAnimation } from '@/hooks/use-progress-animation';
import { getCurrentBadgeLevel, getNextBadgeLevel, BADGE_LEVELS } from '@/constants/badge-levels';
import { NumberTicker } from '@/components/ui/number-ticker';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
// 使用全局的 Aeonik 字体工具类

interface CompletionDialogProps {
  open: boolean;
  onClose: () => void;
  initialPoints: number; // 之前的点数
  finalPoints: number;   // 更新后的点数
  isLoading?: boolean;   // 加载状态
}

export function CompletionDialog({
  open,
  onClose,
  initialPoints,
  finalPoints,
  isLoading = false
}: CompletionDialogProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const tBadges = useTranslations('badges');
  
  const {
    displayedPoints,
    displayedProgress,
    isAnimationComplete,
    currentBadge,
    initialProgress
  } = useProgressAnimation({
    initialPoints,
    finalPoints
  });
  
  // 获取下一级徽章
  const nextBadge = getNextBadgeLevel(displayedPoints);
  
  // 检查是否刚刚升级
  const initialBadge = getCurrentBadgeLevel(initialPoints);
  const finalBadge = getCurrentBadgeLevel(finalPoints);
  const hasLeveledUp = initialBadge.id !== finalBadge.id;

  // 计算距离下一个里程碑还需要的点数
  const pointsToNextMilestone = nextBadge ? nextBadge.minPoints - displayedPoints : 0;

  // 计算下一个里程碑的编号
  const currentIndex = BADGE_LEVELS.findIndex(l => l.id === finalBadge.id);
  const nextMilestoneNumber = currentIndex >= 0 ? currentIndex + 2 : 1;
  
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, [open, initialPoints, finalPoints]);
  
  const handleClose = () => {
    setIsExiting(true);
    // 等待退场动画完成后再关闭
    setTimeout(() => {
      onClose();
      setIsExiting(false);
    }, 500);
  };
  
  if (!isMounted) return null;
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-linear-to-tr from-slate-50 via-slate-100 to-slate-200 border-white/20 sm:max-w-md" hideCloseButton={true}>
        <DialogTitle className="sr-only">
          {hasLeveledUp ? tBadges('levelUp') : tBadges('completed')}
        </DialogTitle>
        <div className="flex flex-col items-center p-4">
          <motion.div
            className="w-full"
            initial={{ opacity: 1 }}
            animate={{ opacity: isExiting ? 0 : 1 }}
            transition={{ duration: 0.3 }}
          >
          {/* 成就点数显示卡片（等级切换时丝滑过场） */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBadge.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 p-4 rounded-xl w-full text-black"
              style={{ backgroundColor: currentBadge.color }}
            >
              <div className="mb-2">
                <span className={`font-semibold text-2xl font-Aeonik`}>{tBadges(`levels.${currentBadge.id}`)}</span>
              </div>
              <div className="flex flex-col">
                {/* 点数和标签 */}
                <div className="flex flex-col">
                  <div className="font-bold text-8xl leading-none tracking-tighter">
                    <NumberTicker
                      value={finalPoints}
                      startValue={initialPoints}
                      className="font-bold text-black text-8xl tracking-tighter whitespace-pre-wrap"
                    />
                  </div>
                  <div className={`mt-2 text-lg font-semibold font-Aeonik`} style={{ letterSpacing: '1px' }}>
                    {tBadges('pointsEarned')}
                  </div>
                </div>

                {/* 进度条 */}
                <div className="bg-black/20 mt-4 rounded-full w-full h-3 overflow-hidden">
                  <div 
                    className="h-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${displayedProgress}%`,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)'
                    }}
                  ></div>
                </div>
                
                {/* 下一个里程碑信息 */}
                {nextBadge && (
                  <div className={`mt-2 text-lg font-semibold font-Aeonik`}>
                    {tBadges('nextMilestone', { points: pointsToNextMilestone, number: nextMilestoneNumber })}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

            {/* 底部按钮 */}
            <LoadingButton
              onClick={handleClose}
              className="bg-linear-to-r from-purple-500 hover:from-purple-600 to-purple-700 hover:to-purple-800 shadow-md py-2 rounded-lg w-full text-white"
              disabled={!isAnimationComplete}
              isLoading={isLoading}
              variant="default"
            >
              {tBadges('nextRound')}
            </LoadingButton>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
