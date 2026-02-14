'use client';

import { FC, RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { VideoPlayer, VideoPlayerHandle } from '@/components/video-player';
import TvStandFrame from '@/components/tv-stand-frame';
import { getVideoAreaMotionProps } from '@/config/animation';
import { DeleteVideoButton } from './delete-video-button';
import { CaptureButton } from './capture-button';
import { PauseGuide } from './pause-guide';

interface PlayerContainerProps {
  currentVideoId: string;
  currentVideoUrl: string;
  playerRef: RefObject<VideoPlayerHandle | null>;
  onPlayerReady?: () => void;
}

export const PlayerContainer: FC<PlayerContainerProps> = ({
  currentVideoId,
  currentVideoUrl,
  playerRef,
  onPlayerReady,
}) => {
  return (
    <div className="flex justify-center items-center w-full h-full">
      <AnimatePresence mode="wait">
        <motion.div key={currentVideoId} {...getVideoAreaMotionProps()}>
          <div className="relative">
            <TvStandFrame>
              <div className="relative w-[780px] h-[439px]">
                {currentVideoUrl && (
                  <VideoPlayer 
                    ref={playerRef} 
                    url={currentVideoUrl} 
                    onReady={onPlayerReady}
                  />
                )}
              </div>
            </TvStandFrame>
            <DeleteVideoButton />
            <PauseGuide />
            <CaptureButton />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
