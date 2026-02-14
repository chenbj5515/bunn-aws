'use client';

import { useAtomValue } from 'jotai';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import InlineLimitBanner from '@/components/ui/inline-limit-banner';
import { captureStateAtom, CaptureStage } from '../../_store';

export default function RateLimitedView() {
  const tSubtitle = useTranslations('subtitleCapture');
  const state = useAtomValue(captureStateAtom);
  const imageUrl = state.stage === CaptureStage.RateLimited ? state.imageUrl : undefined;

  return (
  <motion.div
    key="limit"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.24, ease: 'easeOut' }}
    className="flex flex-col justify-center items-center mt-4 py-8"
  >
    <div className="flex flex-col items-center gap-4">
      <div className="drop-shadow-md">
        <InlineLimitBanner fontSizePx={28} textClassName="text-white" />
      </div>
    </div>
    {imageUrl && (
      <div className="mt-6">
        <img
          src={imageUrl}
          alt={tSubtitle('previewAlt')}
          className="shadow-lg border border-white/20 rounded-lg max-w-xs max-h-32 object-contain"
        />
      </div>
    )}
  </motion.div>
  );
};
