'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { captureStateAtom, closeCaptureAtom, CaptureStage } from '../../_store';
import { FadeItem } from './fade-item';

export default function ErrorView() {
  const tSubtitle = useTranslations('subtitleCapture');
  const state = useAtomValue(captureStateAtom);
  const closeCapture = useSetAtom(closeCaptureAtom);

  const message = state.stage === CaptureStage.Error ? state.message : '';
  const imageUrl = state.stage === CaptureStage.Error ? state.imageUrl : undefined;

  return (
  <motion.div
    key="error"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.24, ease: 'easeOut' }}
  >
    <FadeItem delay={0}>
      <div className="mt-2 mb-8 ml-2 text-white text-lg">
        {message || tSubtitle('errors.extractFailed')}
      </div>
    </FadeItem>

    <FadeItem delay={0.04}>
      {imageUrl && (
        <div className="mb-8">
          <img
            src={imageUrl}
            alt={tSubtitle('previewAlt')}
            className="shadow-lg mx-auto border border-white/20 rounded-lg max-w-xs max-h-32 object-contain"
          />
        </div>
      )}
    </FadeItem>

    <FadeItem delay={0.12}>
      <div className="flex justify-center mt-8">
        <button
          onClick={() => closeCapture()}
          className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl text-white text-lg transition-colors"
        >
          {tSubtitle('confirm')}
        </button>
      </div>
    </FadeItem>
  </motion.div>
  );
};
