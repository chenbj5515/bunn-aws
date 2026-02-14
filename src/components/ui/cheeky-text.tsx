'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CheekyTextProps {
  text: string;
  className?: string;
}

/**
 * 带有弹跳动画效果的文字组件
 */
export default function CheekyText({ text, className }: CheekyTextProps) {
  return (
    <motion.span
      className={cn('inline-block', className)}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 15,
      }}
    >
      {text}
    </motion.span>
  );
}
