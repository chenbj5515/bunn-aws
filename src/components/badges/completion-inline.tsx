'use client';

import { useEffect, useState } from 'react';
import { NumberTicker } from '@/components/ui/number-ticker';
import { useProgressAnimation } from '@/hooks/use-progress-animation';
import { AchievementBadge } from '@/components/badges/achievement-badge';
import { BADGE_LEVELS, getCurrentBadgeLevel, getNextBadgeLevel, getCurrentLevelProgress } from '@/constants/badge-levels';
import { LoadingButton } from '@/components/ui/loading-button';
import CtaButton from '@/components/ui/cta-button';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
// 使用全局的 Aeonik 字体工具类

interface CompletionInlineProps {
  initialPoints: number;
  finalPoints: number;
  onContinue: () => void;
  isLoading?: boolean;
}

export function CompletionInline({
  initialPoints,
  finalPoints,
  onContinue,
  isLoading = false,
}: CompletionInlineProps) {
  const locale = useLocale();
  const tBadges = useTranslations('badges');

  function shadeHexColor(hex: string, percent: number) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.min(255, Math.max(0, Math.round(r + (255 - r) * percent)));
    g = Math.min(255, Math.max(0, Math.round(g + (255 - g) * percent)));
    b = Math.min(255, Math.max(0, Math.round(b + (255 - b) * percent)));
    return `rgb(${r}, ${g}, ${b})`;
  }

  const {
    displayedPoints,
    currentBadge,
    initialProgress,
    isAnimationComplete,
  } = useProgressAnimation({ initialPoints, finalPoints, animationDuration: 2400 });

  const nextBadge = getNextBadgeLevel(displayedPoints);
  const pointsToNextMilestone = nextBadge ? Math.max(0, nextBadge.minPoints - finalPoints) : 0;
  // 用于更丝滑的进度条：从 initialProgress 一次性动画到 finalProgress
  const finalProgress = getCurrentLevelProgress(finalPoints);

  // 当前等级索引（0 起始），当前里程碑号=索引+1，下一里程碑号=索引+2
  const currentIndex = BADGE_LEVELS.findIndex(l => l.id === currentBadge.id);
  const nextMilestoneNumber = currentIndex >= 0 ? currentIndex + 2 : 1;

  return (
    <motion.div
      className=""
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Link href="/badges" className="block" prefetch>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBadge.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto mb-8 p-6 rounded-2xl w-full max-w-[425px] text-black hover:scale-[1.02] transition-transform duration-200 cursor-pointer"
            style={{ backgroundColor: currentBadge.color, aspectRatio: '267 / 165' }}
          >
            {/* 右上角徽章（移除阴影） */}
            <div className="top-3 right-3 absolute">
              <AchievementBadge level={currentBadge.id as any} size="sm" />
            </div>
            {/* 统一垂直间距容器 */}
            <div className="flex flex-col gap-3">
              {/* 等级名称（国际化） */}
              <div className={`font-semibold text-2xl font-Aeonik`}>{tBadges(`levels.${currentBadge.id}`)}</div>

              {/* 点数 */}
              <div className="font-bold text-[4rem] leading-none tracking-tighter">
                <NumberTicker
                  value={finalPoints}
                  startValue={initialPoints}
                  duration={3200}
                  className="font-bold text-[38px] text-black tracking-tighter whitespace-pre-wrap"
                />
              </div>

              {/* 标签文字 */}
              <div className={`text-lg font-semibold font-Aeonik`} style={{ letterSpacing: '1px' }}>{tBadges('pointsEarned')}</div>

              {/* 进度条：底轨为当前背景色加暗化滤镜 */}
              <div className="relative rounded-full w-full h-3 overflow-hidden">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: currentBadge.color, filter: 'brightness(0.85)' }}
                />
                <motion.div
                  className="relative bg-black h-full"
                  initial={{ width: `${initialProgress}%` }}
                  animate={{ width: `${finalProgress}%` }}
                  transition={{ duration: 2.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>

              {/* 下一个里程碑信息 */}
              {nextBadge ? (
                <div className={`text-lg font-semibold font-Aeonik`}>{tBadges('nextMilestone', { points: pointsToNextMilestone, number: nextMilestoneNumber })}</div>
              ) : (
                <div className={`text-lg font-semibold font-Aeonik`}>{tBadges('maxMilestone')}</div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </Link>

      {/* 下一轮按钮 - 在进度与数字动画完成后才出现，并带入场动画 */}
      {/* 始终预留按钮空间，避免出现时挤压布局 */}
      <div className="relative mt-6 h-[46px]">
        {isAnimationComplete && (
          <motion.div
            className="absolute inset-0 flex justify-center"
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: [0.9, 1.06, 1] }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              onClick={onContinue}
              disabled={isLoading}
              className="group relative bg-transparent hover:brightness-110 p-0 border-none outline-offset-4 cursor-pointer select-none"
              style={{ width: 150, height: 46 }}
            >
              {/* 阴影层（和 Let's go 按钮一致）*/}
              <span className="top-0 left-0 absolute bg-black/25 rounded-xl w-full h-full transition-transform translate-y-0.5 group-active:translate-y-px group-hover:translate-y-1 duration-300 will-change-transform cubic-bezier(0.3,0.7,0.4,1)"></span>
              {/* 渐变层（根据 currentBadge.color 生成）*/}
              <span
                className="top-0 left-0 absolute rounded-xl w-full h-full"
                style={{
                  background: `linear-gradient(to left, ${shadeHexColor(currentBadge.color, -0.3)}, ${shadeHexColor(currentBadge.color, -0.15)}, ${shadeHexColor(currentBadge.color, -0.3)})`
                }}
              ></span>
              {/* 内容层（主色块，与 Let's go 一致的位移动效）*/}
              <span
                className="relative flex justify-center items-center rounded-xl font-semibold text-black text-lg transition-transform -translate-y-1 group-active:-translate-y-0.5 group-hover:-translate-y-1.5 duration-300 will-change-transform"
                style={{
                  width: 150,
                  height: 46,
                  backgroundColor: currentBadge.color
                }}
              >
                {tBadges('nextRound')}
              </span>
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}


