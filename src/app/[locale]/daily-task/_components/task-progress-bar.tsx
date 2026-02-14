'use client';

import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import CheekyText from '@/components/ui/cheeky-text';
import {
  getProgressBarMotionProps,
  CSS_ANIMATION_CLASSES
} from '@/animation';

export interface TaskProgressBarProps {
  /** 总数 */
  total: number;
  /** 当前完成数 */
  completed: number;
  /** 连对次数 */
  streak: number;
}

/**
 * 任务进度条组件
 * 简化版进度条，只展示进度和连对次数
 */
export function TaskProgressBar({
  total,
  completed,
  streak
}: TaskProgressBarProps) {
  const t = useTranslations('streakCounter');

  // 计算进度百分比
  const progressPercent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        className={`z-0 relative ${CSS_ANIMATION_CLASSES.SLIDE_IN_FROM_TOP}`}
        {...getProgressBarMotionProps()}
      >
        <div className="relative flex justify-center">
          {/* 背景层 */}
          <div className="relative bg-gray-200 mx-auto rounded-full w-full h-[16px] overflow-hidden">
            {/* 进度填充 */}
            <div
              className="relative bg-linear-to-r from-purple-400 to-purple-600 rounded-full h-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* 连对次数显示 - 绝对定位在进度条上方，基于完成部分居中 */}
          {streak > 1 && (
            <div
              className="-top-[28px] absolute font-Lobster font-bold text-purple-400 text-base tracking-[1px]"
              style={{
                left: `${progressPercent / 2}%`,
                transform: 'translateX(-50%)'
              }}
            >
              <CheekyText
                text={t('consecutive', { count: streak })}
                className="font-bold"
              />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default TaskProgressBar;
