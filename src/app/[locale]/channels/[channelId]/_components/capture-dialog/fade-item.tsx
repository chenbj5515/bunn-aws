'use client';

import { FC, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface FadeItemProps {
  delay?: number;
  children: ReactNode;
}

export const FadeItem: FC<FadeItemProps> = ({ delay = 0, children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.24, ease: 'easeOut', delay }}
  >
    {children}
  </motion.div>
);
