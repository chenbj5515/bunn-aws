'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { OriginalText } from '@/components/memo-card/original-text';
import { getTranslationByLocale } from '@/lib/translation-utils';
import { captureStateAtom, closeCaptureAtom, CaptureStage } from '../../_store';
import { FadeItem } from './fade-item';
import type { WordSegmentationV2 } from '@/types/extended-memo-card';

export default function CompletedView() {
  const tSubtitle = useTranslations('subtitleCapture');
  const locale = useLocale();
  const router = useRouter();
  const state = useAtomValue(captureStateAtom);
  const closeCapture = useSetAtom(closeCaptureAtom);

  const cardData = state.stage === CaptureStage.Completed ? state.cardData : null;
  const imageUrl = state.stage === CaptureStage.Completed ? state.imageUrl : '';

  const handleClose = () => {
    closeCapture();
    router.refresh();
  };

  if (!cardData) return null;

  return (
  <motion.div
    key="completed"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.24, ease: 'easeOut' }}
  >
    <FadeItem delay={0}>
      <div className="mb-12 text-center">
        <h2 className="drop-shadow-md font-medium text-[32px] text-white tracking-wide">
          {tSubtitle('creationSuccess')}
        </h2>
      </div>
    </FadeItem>

    <FadeItem delay={0.08}>
      <div className="mb-12 w-full text-center">
        <div className="text-[20px] text-white">
          <OriginalText
            wordSegmentation={cardData.wordSegmentation as WordSegmentationV2 | null | undefined}
            originalText={cardData.originalText || ''}
            id={cardData.id}
            noOffset={true}
          />
        </div>
      </div>
    </FadeItem>

    <FadeItem delay={0.16}>
      <div className="mb-12 w-full text-left">
        <div className="text-[20px] text-white/90 whitespace-pre-wrap">
          {getTranslationByLocale(cardData.translation, locale)}
        </div>
      </div>
    </FadeItem>

    <FadeItem delay={0.20}>
      {imageUrl && (
        <div className="mb-12">
          <img
            src={imageUrl}
            alt={tSubtitle('previewAlt')}
            className="shadow-lg mx-auto border border-white/20 rounded-lg max-w-xs max-h-32 object-contain"
          />
        </div>
      )}
    </FadeItem>

    <FadeItem delay={0.28}>
      <div className="mt-12 text-center">
        <Button
          onClick={handleClose}
          className="group inline-flex relative justify-center items-center gap-2 bg-transparent! hover:bg-transparent! shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_8px_rgba(0,0,0,0.06)] px-8 py-6 border border-[#FFFFFFB3] hover:border-[#FFFFFFCC] rounded-full ring-[#FFFFFF66] ring-1 w-[180px] font-medium text-[#FFFFFF] transform-gpu hover:scale-[1.02] transition-all duration-200 ease-out"
        >
          {tSubtitle('confirm')}
        </Button>
      </div>
    </FadeItem>
  </motion.div>
  );
};
