'use client';

import { FC, useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { Camera } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CtaRoundButton } from '@/components/ui/cta-button';
import {
  isCapturingAtom,
  startCaptureAtom,
  currentVideoIdAtom,
} from '../../../_store';
import { BUTTON_SIZE } from '../../../_utils/constants';

/**
 * 截屏按钮组件
 */
export const CaptureButton: FC = () => {
  const t = useTranslations('channels');

  // 读取状态
  const isCapturing = useAtomValue(isCapturingAtom);
  const currentVideoId = useAtomValue(currentVideoIdAtom);

  // Action
  const startCapture = useSetAtom(startCaptureAtom);

  const handleClick = useCallback(() => {
    if (isCapturing || !currentVideoId) return;
    startCapture(currentVideoId);
  }, [isCapturing, currentVideoId, startCapture]);

  return (
    <div className="right-[-66px] bottom-[22px] z-30 absolute">
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <CtaRoundButton
              baseColor="#000000"
              onClick={handleClick}
              disabled={isCapturing}
              size={BUTTON_SIZE.ROUND}
              aria-label={t('captureSubtitles')}
              className="group"
            >
              <ButtonContent isCapturing={isCapturing} />
            </CtaRoundButton>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          <p>{t('captureSubtitles')}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

// ============================================
// 子组件
// ============================================

interface ButtonContentProps {
  isCapturing: boolean;
}

const ButtonContent: FC<ButtonContentProps> = ({ isCapturing }) => {
  if (isCapturing) {
    return <span className="border-white border-b-2 rounded-full w-6 h-6 animate-spin" />;
  }
  return <Camera className="w-6 h-6 text-white" />;
};
