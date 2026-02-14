'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BADGE_LEVELS, getCurrentBadgeLevel, getCurrentLevelProgress, getNextBadgeLevel } from '@/constants/badge-levels';
import { AchievementBadge } from '@/components/badges/achievement-badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface SettlementClientProps {
  initialPoints: number;
  finalPoints: number;
  showButton?: boolean;
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export function SettlementClient({ initialPoints, finalPoints, showButton = true }: SettlementClientProps) {
  const tBadges = useTranslations('badges');

  const initialBadge = useMemo(() => getCurrentBadgeLevel(initialPoints), [initialPoints]);
  const finalBadge = useMemo(() => getCurrentBadgeLevel(finalPoints), [finalPoints]);

  const crossesLevel = initialBadge.id !== finalBadge.id;

  // 计算下一级徽章信息
  const nextBadge = useMemo(() => getNextBadgeLevel(finalPoints), [finalPoints]);
  const pointsToNextMilestone = nextBadge ? Math.max(0, nextBadge.minPoints - finalPoints) : 0;
  const currentIndex = BADGE_LEVELS.findIndex(l => l.id === finalBadge.id);
  const nextMilestoneNumber = currentIndex >= 0 ? currentIndex + 2 : 1;

  const [phase, setPhase] = useState<'fill-old' | 'switch-card' | 'fill-new' | 'single'>(() => {
    return crossesLevel ? 'fill-old' : 'single';
  });

  // 进度条显示百分比（0-100）
  const [progress, setProgress] = useState<number>(() => getCurrentLevelProgress(initialPoints));
  const progressRef = useRef<number | null>(null);

  // 卡片颜色
  const [cardColor, setCardColor] = useState<string>(initialBadge.color);
  const [badgeId, setBadgeId] = useState<string>(initialBadge.id);

  const startSinglePhase = () => {
    const start = getCurrentLevelProgress(initialPoints);
    const end = getCurrentLevelProgress(finalPoints);
    const duration = 2800;
    const startTime = performance.now();
    
    if (progressRef.current) cancelAnimationFrame(progressRef.current);
    setProgress(start);
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress_p = Math.min(elapsed / duration, 1);
      
      // 使用 cubic ease-out 缓动函数
      const eased = 1 - Math.pow(1 - progress_p, 3);
      setProgress(start + (end - start) * eased);
      
      if (progress_p < 1) {
        progressRef.current = requestAnimationFrame(animate);
      } else {
        setProgress(end);
        progressRef.current = null;
      }
    };
    
    progressRef.current = requestAnimationFrame(animate);
  };

  const startCrossLevelPhases = () => {
    // 第一阶段：把旧等级的进度条补满
    const start1 = getCurrentLevelProgress(initialPoints);
    const end1 = 100;
    const duration1 = 1800;
    const startTime1 = performance.now();
    
    if (progressRef.current) cancelAnimationFrame(progressRef.current);
    setProgress(start1);
    
    const animatePhase1 = (currentTime: number) => {
      const elapsed = currentTime - startTime1;
      const progress_p = Math.min(elapsed / duration1, 1);
      
      // 使用 cubic ease-out 缓动函数
      const eased = 1 - Math.pow(1 - progress_p, 3);
      setProgress(start1 + (end1 - start1) * eased);
      
      if (progress_p < 1) {
        progressRef.current = requestAnimationFrame(animatePhase1);
      } else {
        setProgress(end1);
        progressRef.current = null;
        // 切换卡片颜色
        setPhase('switch-card');
        setTimeout(() => {
          setCardColor(finalBadge.color);
          setBadgeId(finalBadge.id);
          // 第二阶段：新等级从0到目标进度
          setPhase('fill-new');
          const start2 = 0;
          const end2 = getCurrentLevelProgress(finalPoints);
          const duration2 = 2000;
          const startTime2 = performance.now();
          
          setProgress(start2);
          
          const animatePhase2 = (currentTime: number) => {
            const elapsed = currentTime - startTime2;
            const progress_p = Math.min(elapsed / duration2, 1);
            
            // 使用 ease-in-out 缓动函数
            const eased = progress_p < 0.5 
              ? 2 * progress_p * progress_p 
              : 1 - Math.pow(-2 * progress_p + 2, 2) / 2;
            setProgress(start2 + (end2 - start2) * eased);
            
            if (progress_p < 1) {
              progressRef.current = requestAnimationFrame(animatePhase2);
            } else {
              setProgress(end2);
              progressRef.current = null;
            }
          };
          
          progressRef.current = requestAnimationFrame(animatePhase2);
        }, 200);
      }
    };
    
    progressRef.current = requestAnimationFrame(animatePhase1);
  };

  useEffect(() => {
    if (initialPoints === finalPoints) {
      setProgress(getCurrentLevelProgress(finalPoints));
      setCardColor(finalBadge.color);
      setBadgeId(finalBadge.id);
      return;
    }
    if (crossesLevel) {
      setPhase('fill-old');
      setCardColor(initialBadge.color);
      setBadgeId(initialBadge.id);
      startCrossLevelPhases();
    } else {
      setPhase('single');
      setCardColor(initialBadge.color);
      setBadgeId(initialBadge.id);
      startSinglePhase();
    }
    return () => {
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
    };
  }, [initialPoints, finalPoints, crossesLevel, initialBadge.color, initialBadge.id, finalBadge.color, finalBadge.id]);

  const pointsDuration = 2200;

  return (
    <div className="flex flex-col items-center w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={badgeId}
          className="relative mx-auto p-6 rounded-2xl w-full max-w-[425px] text-black"
          style={{ backgroundColor: cardColor, aspectRatio: '267 / 165' }}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="top-3 right-3 absolute">
            <AchievementBadge level={badgeId as any} size="sm" />
          </div>

          <div className="flex flex-col gap-3">
            <div className="font-NewYork font-semibold text-2xl">
              {tBadges(`levels.${badgeId}`)}
            </div>
            <div className="font-bold leading-none tracking-tighter">
              <NumberTicker
                value={finalPoints}
                startValue={initialPoints}
                className="font-bold text-[38px] text-black tracking-tighter whitespace-pre-wrap"
              />
            </div>

            {/* 标签文字 */}
            <div className={`text-lg font-semibold font-Aeonik`} style={{ letterSpacing: '1px' }}>{tBadges('pointsEarned')}</div>

            {/* 进度条 */}
            <div className="relative rounded-full w-full h-3 overflow-hidden">
              <div className="absolute inset-0 rounded-full" style={{ backgroundColor: cardColor, filter: 'brightness(0.85)' }} />
              <div className="relative bg-black h-full will-change-[width]" style={{ width: `${clamp(progress, 0, 100)}%` }} />
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

      {showButton && (
        <div className="relative mx-auto mt-[46px] w-full max-w-[425px] h-[46px]">
          <Link href="/daily-task" className="group inline-block relative bg-transparent hover:brightness-110 p-0 border-none outline-offset-4 w-full h-full cursor-pointer select-none" prefetch>
            <span className="top-0 left-0 absolute bg-black/25 rounded-xl w-full h-full transition-transform translate-y-0.5 group-active:translate-y-px group-hover:translate-y-1 duration-300 will-change-transform cubic-bezier(0.3,0.7,0.4,1)"></span>
            <span className="top-0 left-0 absolute rounded-xl w-full h-full" style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.15), rgba(0,0,0,0.08), rgba(0,0,0,0.15))' }}></span>
            <span className="relative flex justify-center items-center rounded-xl w-full h-full text-black text-lg transition-transform -translate-y-1 group-active:-translate-y-0.5 group-hover:-translate-y-1.5 duration-300 will-change-transform" style={{ backgroundColor: cardColor }}>
              {tBadges('nextRound')}
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default SettlementClient;


