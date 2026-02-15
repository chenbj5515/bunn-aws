'use client';

import { FC, useRef, useEffect, forwardRef } from 'react';
import { useAtomValue } from 'jotai';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AnimatePresence } from 'framer-motion';
import { useCloseMoreVideosGuide } from '@/hooks/use-close-more-videos-guide';
import { hasEverPlayedAtom, isVideoPausedAtom } from '../../../_store';
import { isChineseLocale } from '../../../_utils/constants';

/**
 * 暂停引导组件
 * 当用户暂停视频时显示引导提示
 */
export const PauseGuide: FC = () => {
  const t = useTranslations('channels');
  const { locale } = useParams() as { locale: string };
  const guideImageRef = useRef<HTMLImageElement>(null!);

  // 读取播放状态
  const hasEverPlayed = useAtomValue(hasEverPlayedAtom);
  const isVideoPaused = useAtomValue(isVideoPausedAtom);

  // 引导状态
  const { userClosedMoreVideos, setGuideVisible } = useCloseMoreVideosGuide();

  // 计算是否显示引导
  const isGuideVisible = hasEverPlayed && isVideoPaused && !userClosedMoreVideos;

  // 更新引导可见性
  useEffect(() => {
    setGuideVisible(isGuideVisible);
  }, [setGuideVisible, isGuideVisible]);

  const isChinese = isChineseLocale(locale);

  return (
    <AnimatePresence>
      {isGuideVisible && (
        <GuideContent
          locale={locale}
          isChinese={isChinese}
          closeText={t('pauseGuide.closeMoreVideos')}
          subtitleText={t('pauseGuide.showSubtitles')}
          guideImageRef={guideImageRef}
        />
      )}
    </AnimatePresence>
  );
};

// ============================================
// 子组件
// ============================================

interface GuideContentProps {
  locale: string;
  isChinese: boolean;
  closeText: string;
  subtitleText: string;
  guideImageRef: React.RefObject<HTMLImageElement>;
}

const GuideContent: FC<GuideContentProps> = ({
  isChinese,
  closeText,
  subtitleText,
  guideImageRef,
}) => {
  const textPositionClass = isChinese ? 'right-[-135px]' : 'right-[-175px]';
  const imagePositionClass = 'right-[-115px]';

  return (
    <>
      <GuideText
        positionClass={textPositionClass}
        closeText={closeText}
        subtitleText={subtitleText}
      />
      <GuideImage
        ref={guideImageRef}
        positionClass={imagePositionClass}
      />
    </>
  );
};

interface GuideTextProps {
  positionClass: string;
  closeText: string;
  subtitleText: string;
}

const GuideText: FC<GuideTextProps> = ({ positionClass, closeText, subtitleText }) => {
  return (
    <div
      className={`${positionClass} bottom-[290px] absolute px-4 py-3 rounded-lg font-sans font-bold text-center translate-x-[100px] translate-y-[20px]`}
    >
      <div className="leading-tight" style={{ color: '#9333EA' }}>
        {closeText}
      </div>
      <div className="mt-1 leading-tight whitespace-nowrap" style={{ color: '#9333EA' }}>
        {subtitleText}
      </div>
    </div>
  );
};

interface GuideImageProps {
  positionClass: string;
}

const GuideImage = forwardRef<HTMLImageElement, GuideImageProps>(({ positionClass }, ref) => {
  return (
    <img
      ref={ref}
      src="/images/indicator-left.png"
      alt="指示箭头"
      className={`${positionClass} bottom-[150px] absolute w-[206px] h-[128px] translate-x-[20px] pointer-events-none`}
    />
  );
});

GuideImage.displayName = 'GuideImage';
