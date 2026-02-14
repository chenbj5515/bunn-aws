'use client';

import { FC, RefObject } from 'react';
import { useAtomValue } from 'jotai';
import { VideoPlayerHandle } from '@/components/video-player';
import VideoProgressBarMulti from '@/components/video-progress-bar-multi';
import { currentVideoMarkersAtom } from '../../../_store';
import { VIDEO_PLAYER_CONFIG } from '../../../_utils/constants';

interface ProgressBarSectionProps {
  duration: number;
  markers: ReturnType<typeof useAtomValue<typeof currentVideoMarkersAtom>>;
  playerRef: RefObject<VideoPlayerHandle | null>;
  onMarkerClick: (markerId: string) => void;
}

export const ProgressBarSection: FC<ProgressBarSectionProps> = ({
  duration,
  markers,
  playerRef,
  onMarkerClick,
}) => {
  if (duration <= 0) return null;

  return (
    <VideoProgressBarMulti
      videoPlayerRef={playerRef.current}
      duration={duration}
      visible={true}
      width={VIDEO_PLAYER_CONFIG.PLAYER_WIDTH}
      markers={markers}
      onMarkerClick={onMarkerClick}
    />
  );
};
