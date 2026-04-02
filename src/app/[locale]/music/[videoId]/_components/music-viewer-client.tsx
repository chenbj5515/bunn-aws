'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { VideoPlayer, type VideoPlayerHandle } from '@/components/video-player';
import TvStandFrame from '@/components/tv-stand-frame';
import { LyricsOverlay } from './lyrics-overlay';
import { LyricsEditor } from './lyrics-editor';
import { MusicTitleBar } from './music-title-bar';
import { useMusicContext } from '../../_components/music-provider';
import { getVideoAreaMotionProps } from '@/config/animation';
import type { LyricLine } from '../page';

interface MusicViewerClientProps {
  videoId: string;
  videoTitle: string | null;
  lyrics: LyricLine[];
  adminUserId: string;
}

export function MusicViewerClient({
  videoId,
  videoTitle,
  lyrics: initialLyrics,
  adminUserId,
}: MusicViewerClientProps) {
  const { isAdmin } = useMusicContext();
  const playerRef = useRef<VideoPlayerHandle>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>(initialLyrics);

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const handleStateChange = useCallback((state: number) => {
    const playing = state === 1;
    setIsPlaying(playing);
    if (playing && !hasStartedPlaying) {
      setHasStartedPlaying(true);
    }
  }, [hasStartedPlaying]);

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying]);

  const handleSeekTo = useCallback((startTime: number, endTime?: number) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(startTime);
    playerRef.current.playVideo();
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (playerRef.current) {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleLyricsSubmit = useCallback((newLyrics: LyricLine[]) => {
    setLyrics(newLyrics);
    setIsEditMode(false);
  }, []);

  const hasLyrics = lyrics.length > 0;
  const canEdit = isAdmin;

  const shouldShowLyricsOverlay = hasStartedPlaying && hasLyrics && !isEditMode;
  const shouldShowEditor = hasStartedPlaying && (isEditMode || (!hasLyrics && canEdit));

  const showTitleBar = !shouldShowLyricsOverlay && !shouldShowEditor;

  return (
    <>
      {/* 顶部搜索栏 - 仅在没有覆盖层时显示 */}
      {showTitleBar && (
        <MusicTitleBar currentVideoId={videoId} currentVideoTitle={videoTitle} />
      )}

      {/* 视频播放器层 - z-base，不阻挡 Dock 和 Header */}
      <div className="z-(--z-base) fixed inset-0 flex justify-center items-center pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div key={videoId} {...getVideoAreaMotionProps()} className="pointer-events-auto">
            <div className="relative">
              <TvStandFrame>
                <div className="relative w-[780px] h-[439px]">
                  <VideoPlayer
                    ref={playerRef}
                    url={videoUrl}
                    showControls={false}
                    onStateChange={handleStateChange}
                  />
                </div>
              </TvStandFrame>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 歌词覆盖层 - 有歌词时播放后自动显示 */}
      {shouldShowLyricsOverlay && (
        <LyricsOverlay
          lyrics={lyrics}
          currentTime={currentTime}
          isPlaying={isPlaying}
          videoTitle={videoTitle}
          onPlayPause={handlePlayPause}
          onSeekTo={handleSeekTo}
          onClose={() => setHasStartedPlaying(false)}
          onEditClick={canEdit ? () => setIsEditMode(true) : undefined}
          canEdit={canEdit}
        />
      )}

      {/* 编辑模式 - 没有歌词时自动进入，或点击编辑按钮进入 */}
      {shouldShowEditor && (
        <LyricsEditor
          videoId={videoId}
          videoTitle={videoTitle}
          existingLyrics={lyrics}
          adminUserId={adminUserId}
          onSubmit={handleLyricsSubmit}
          onCancel={() => {
            if (hasLyrics) {
              setIsEditMode(false);
            } else {
              setHasStartedPlaying(false);
            }
          }}
        />
      )}
    </>
  );
}

export default MusicViewerClient;
