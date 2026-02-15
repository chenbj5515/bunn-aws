'use client';

import { useRef, useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { VideoPlayerHandle } from '@/components/video-player';
import {
  currentVideoIdAtom,
  currentVideoUrlAtom,
  videoDurationAtom,
  currentVideoMarkersAtom,
  videoPlayerRefAtom,
  showMemoCardModalAtom,
} from '../../_store';
import { PlayerContainer } from './_components/player-container';
import { ProgressBarSection } from './_components/progress-bar-section';
import { usePlayerStateSync } from './_hooks/use-player-state-sync';

/**
 * 电视播放器区域组件
 */
export default function TvPlayerSection() {
  const videoPlayerRef = useRef<VideoPlayerHandle | null>(null);

  // 读取状态
  const currentVideoId = useAtomValue(currentVideoIdAtom);
  const currentVideoUrl = useAtomValue(currentVideoUrlAtom);
  const videoDuration = useAtomValue(videoDurationAtom);
  const markers = useAtomValue(currentVideoMarkersAtom);

  // 写入状态
  const setVideoPlayerRef = useSetAtom(videoPlayerRefAtom);
  const showMemoCardModal = useSetAtom(showMemoCardModalAtom);

  // 播放器加载完成时确保引用已同步到 store
  const handlePlayerReady = () => {
    setVideoPlayerRef(videoPlayerRef.current);
  };

  // 持续同步播放器引用到 store（确保切换视频时 ref 及时更新）
  useEffect(() => {
    setVideoPlayerRef(videoPlayerRef.current);
  }, [currentVideoId]);

  // 组件卸载时清理 store 中的引用
  useEffect(() => {
    return () => setVideoPlayerRef(null);
  }, [setVideoPlayerRef]);

  // 同步播放器状态
  usePlayerStateSync(videoPlayerRef);

  // 处理标记点击
  const handleMarkerClick = (markerId: string) => {
    showMemoCardModal(markerId);
    videoPlayerRef.current?.pauseVideo();
    history.replaceState(null, '', `?cardId=${markerId}`);
  };

  return (
    <>
      <PlayerContainer
        currentVideoId={currentVideoId}
        currentVideoUrl={currentVideoUrl}
        playerRef={videoPlayerRef}
        onPlayerReady={handlePlayerReady}
      />
      <ProgressBarSection
        duration={videoDuration}
        markers={markers}
        playerRef={videoPlayerRef}
        onMarkerClick={handleMarkerClick}
      />
    </>
  );
}
