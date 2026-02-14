'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  initialProgress: number; // 初始进度（百分比，0-100）
  finalProgress: number;   // 最终进度（百分比，0-100）
  color?: string;          // 进度条颜色
  duration?: number;       // 动画持续时间（毫秒）
  showAnimation?: boolean; // 是否显示动画
  className?: string;
}

export function ProgressBar({
  initialProgress,
  finalProgress,
  color = 'from-gray-800 via-black to-gray-900',
  duration = 1000,
  showAnimation = true,
  className
}: ProgressBarProps) {
  const [progress, setProgress] = useState(initialProgress);
  
  useEffect(() => {
    if (showAnimation) {
      // 从初始进度开始动画
      setProgress(initialProgress);
      
      // 使用setTimeout而不是直接设置finalProgress，确保动画效果平滑
      const timer = setTimeout(() => {
        setProgress(finalProgress);
      }, 100); // 短暂延迟后开始动画
      
      return () => clearTimeout(timer);
    } else {
      // 不需要动画，直接设置最终进度
      setProgress(finalProgress);
    }
  }, [initialProgress, finalProgress, showAnimation]);
  
  return (
    <div className={cn("relative bg-white/10 shadow-progress backdrop-blur-xl border border-white/20 rounded-full w-full h-4 overflow-hidden", className)}>
      {/* 内部高光效果 */}
      <div className="top-0 absolute inset-x-0 bg-linear-to-r from-transparent via-white/60 to-transparent rounded-full h-px" />
      
      {/* 进度填充 - 液态效果 */}
      <motion.div
        className={`relative bg-size-[200%_200%] bg-linear-to-tr ${color} shadow-progress-fill rounded-full h-full overflow-hidden transition-all animate-liquidFlow duration-700 ease-out`}
        initial={{ width: `${initialProgress}%` }}
        animate={{ width: `${progress}%` }}
        transition={{ 
          duration: duration / 1000 * 1.2, // 稍微增加时间使动画更为明显
          ease: "easeInOut" // 更改为带有加速减速效果的缓动函数
        }}
      >
        {/* 液态表面光泽 */}
        <div className="absolute inset-0 bg-linear-to-b from-white/20 via-transparent to-white/5 rounded-full" />
        
        {/* 流动光效 */}
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent opacity-30 rounded-full animate-shimmer" />
      </motion.div>
      
      {/* 外部光晕效果 */}
      <div className="absolute inset-0 bg-linear-to-r from-black/30 via-black/40 to-black/30 blur-md rounded-full scale-120 pointer-events-none" />
    </div>
  );
}
