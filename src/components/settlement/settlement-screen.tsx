'use client'

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import SettlementClient from '@/components/badges/settlement-client';
import { SETTLEMENT_EXPERIENCE_MOTION } from '@/animation';
import { getCurrentBadgeLevel } from '@/constants/badge-levels';
import { Link } from '@/i18n/navigation';
import { SETTLEMENT_VIDEO_URL_ALT } from '@/constants/utils';

interface SettlementScreenProps {
  initialPoints: number;
  finalPoints: number;
  variant?: 'overlay' | 'page';
  initialAchievementPoints?: number;
  user?: { id: string; email: string; image?: string | null };
  subscription?: { active: boolean; expireTime: string; type?: 'subscription' | 'oneTime' | null };
}

export default function SettlementScreen({
  initialPoints,
  finalPoints,
  variant = 'page',
}: SettlementScreenProps) {
  const tBadges = useTranslations('badges');
  const cardColor = getCurrentBadgeLevel(finalPoints).color;
  const { overlay, panel, video, content } = SETTLEMENT_EXPERIENCE_MOTION;

  const isOverlay = variant === 'overlay';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  // 守门阀：一旦收到“最终提交”事件，允许有声播放，且不再被其他回调静音
  const allowSoundPlaybackRef = useRef<boolean>(false);

  // 预热加载，尽快解码首帧
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.preload = 'auto';
      v.load();
    } catch {
      // ignore
    }
  }, []);

  // 初始仅保证静音自动播放；不做全局手势解锁，避免其他点击误触发
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const startMuted = async () => {
      try {
        v.muted = true;
        await v.play();
      } catch {
        // ignore
      }
    };
    void startMuted();

    return () => {
      // no-op
    };
  }, []);

  // 仅在特定自定义事件下尝试带声播放；不监听任意点击
  useEffect(() => {
    const restartFromBeginningAndPlay = async (delayMs: number) => {
      const v = videoRef.current;
      if (!v) return;
      try { v.pause(); } catch {}
      try {
        const anyVideo: any = v as any;
        if (typeof anyVideo.fastSeek === 'function') {
          try { anyVideo.fastSeek(0); } catch { v.currentTime = 0; }
        } else {
          v.currentTime = 0;
        }
      } catch {}
      try {
        v.muted = false;
        v.volume = 1;
      } catch {}
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      try {
        await v.play();
      } catch {
        try {
          v.muted = true;
          await v.play();
        } catch {}
      }
    };

    const onVisible = async () => {
      // 如果已经允许有声播放，则不再强制静音，避免“短暂有声后被静音”
      if (allowSoundPlaybackRef.current) return;
      const v = videoRef.current;
      if (!v) return;
      try {
        v.muted = true;
        await v.play();
      } catch {
        // ignore
      }
    };
    const onFinalContinue = () => {
      allowSoundPlaybackRef.current = true;
      void restartFromBeginningAndPlay(0);
    };

    window.addEventListener('settlementVisible', onVisible as EventListener);
    window.addEventListener('settlementPlayWithSound', onFinalContinue as EventListener);
    return () => {
      window.removeEventListener('settlementVisible', onVisible as EventListener);
      window.removeEventListener('settlementPlayWithSound', onFinalContinue as EventListener);
    };
  }, []);

  const Wrapper: any = isOverlay ? motion.div : 'div';
  const wrapperProps = isOverlay
    ? {
        ...overlay,
        className:
          'top-0 right-0 bottom-0 left-0 z-1000 fixed flex items-center bg-white px-4 py-6 min-h-screen'
      }
    : {
        className: 'w-full'
      };

  const Panel: any = isOverlay ? motion.div : 'div';
  const panelProps = isOverlay
    ? { ...panel, className: 'relative mx-auto -mt-40 w-full max-w-sm' }
    : { className: 'w-full max-w-sm' };

  const VideoMotion: any = motion.video;
  const ContentMotion: any = motion.div;

  return (
    <Wrapper {...wrapperProps}>
      <Panel {...panelProps}>
        <div className="flex flex-col items-center gap-6">
          {/* 本轮获取点数展示 - 动漫风格带呼吸动画 */}
          <div className="flex justify-center">
            <div className="animate-breathe">
              <div className="relative">
                {/* 外层光晕效果 */}
                <div className="absolute inset-0 bg-linear-to-r from-[#FFD700] to-[#FFA500] opacity-60 blur-lg rounded-full"></div>

                {/* 主体容器 */}
                <div className="relative flex justify-center items-center gap-2 bg-linear-to-br from-[#FFD700] via-[#FFED4E] to-[#FFA500] shadow-xl px-4 py-1 border-[#FFFFFF] border-2 rounded-full w-[240px] h-[46px]">
                  {/* 装饰性闪光 */}
                  <div className="top-1 left-3 absolute bg-white opacity-80 blur-sm rounded-full w-1.5 h-1.5"></div>
                  <div className="top-1.5 right-4 absolute bg-white opacity-60 blur-sm rounded-full w-1 h-1"></div>

                  {/* 金币图标 */}
                  <div className="relative flex justify-center items-center bg-linear-to-br from-[#FFA500] to-[#FF8C00] shadow-md border-[#FFFFFF] border-2 rounded-full w-8 h-8">
                    <span className="drop-shadow-md font-black text-white text-lg">P</span>
                  </div>

                  {/* Points数字 */}
                  <div className="flex items-center">
                    <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] font-black text-white text-2xl leading-none">
                      +{finalPoints - initialPoints}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl w-full aspect-video overflow-hidden">
            <VideoMotion
              {...video}
              ref={videoRef}
              className="w-full h-full object-cover"
              src={SETTLEMENT_VIDEO_URL_ALT}
              autoPlay
              loop
              playsInline
              muted
              preload="auto"
            />
          </div>

          <ContentMotion {...content} className="w-full">
            <SettlementClient initialPoints={initialPoints} finalPoints={finalPoints} showButton={false} />

            <div className="relative mx-auto mt-6 w-full h-[46px]">
              {isOverlay ? (
                <button
                  onClick={() => window.location.reload()}
                  className="group inline-block relative bg-transparent hover:brightness-110 p-0 border-none outline-offset-4 w-full h-full cursor-pointer select-none"
                >
                  <span className="top-0 left-0 absolute bg-black/25 rounded-xl w-full h-full transition-transform translate-y-0.5 group-active:translate-y-px group-hover:translate-y-1 duration-300 will-change-transform"></span>
                  <span className="relative flex justify-center items-center rounded-xl w-full h-full font-semibold text-[#222] text-[18px] transition-transform -translate-y-1 group-active:-translate-y-0.5 group-hover:-translate-y-1.5 duration-300 will-change-transform" style={{ backgroundColor: cardColor }}>
                    {tBadges('nextRound')}
                  </span>
                </button>
              ) : (
                <Link href="/mobile/daily-task" className="group inline-block relative bg-transparent hover:brightness-110 p-0 border-none outline-offset-4 w-full h-full cursor-pointer select-none" prefetch>
                  <span className="top-0 left-0 absolute bg-black/25 rounded-xl w-full h-full transition-transform translate-y-0.5 group-active:translate-y-px group-hover:translate-y-1 duration-300 will-change-transform"></span>
                  <span className="relative flex justify-center items-center rounded-xl w-full h-full font-semibold text-[#222] text-[18px] transition-transform -translate-y-1 group-active:-translate-y-0.5 group-hover:-translate-y-1.5 duration-300 will-change-transform" style={{ backgroundColor: cardColor }}>
                    {tBadges('nextRound')}
                  </span>
                </Link>
              )}
            </div>
          </ContentMotion>
        </div>
      </Panel>
    </Wrapper>
  );
}


