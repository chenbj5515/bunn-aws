import { useEffect, RefObject } from 'react';
import { useSetAtom } from 'jotai';
import { VideoPlayerHandle } from '@/components/video-player';
import { setVideoDurationAtom, setPlayStateAtom } from '../../../_store';
import { VIDEO_PLAYER_CONFIG, YOUTUBE_PLAYER_STATE } from '../../../_utils/constants';

/**
 * 同步播放器状态到 store
 */
export function usePlayerStateSync(
  playerRef: RefObject<VideoPlayerHandle | null>
) {
  const setVideoDuration = useSetAtom(setVideoDurationAtom);
  const setPlayState = useSetAtom(setPlayStateAtom);

  useEffect(() => {
    const timer = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;

      // 更新时长
      const duration = player.getDuration();
      if (duration) {
        setVideoDuration(duration);
      }

      // 更新播放状态
      const playerState = player.getPlayerState();
      const hasPlayed = playerState === YOUTUBE_PLAYER_STATE.PLAYING ? true : undefined;
      const isPaused =
        playerState === YOUTUBE_PLAYER_STATE.PAUSED ||
        playerState === YOUTUBE_PLAYER_STATE.ENDED ||
        playerState === YOUTUBE_PLAYER_STATE.VIDEO_CUED ||
        playerState === YOUTUBE_PLAYER_STATE.UNSTARTED;

      setPlayState({ isPaused, hasPlayed });
    }, VIDEO_PLAYER_CONFIG.POLL_INTERVAL);

    return () => clearInterval(timer);
  }, [playerRef, setVideoDuration, setPlayState]);
}
