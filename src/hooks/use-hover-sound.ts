"use client";

import {
  useEffect,
  useRef,
  type FocusEventHandler,
  type MouseEventHandler,
  type TouchEventHandler,
} from "react";

type UseHoverSoundOptions = {
  /** 音频路径（在 public 下写绝对路径） */
  src?: string;
  /** 0~1 */
  volume?: number;
  /** 播放速率 */
  playbackRate?: number;
  /** 每次触发时是否从头开始 */
  playFromStart?: boolean;
  /** 节流间隔（毫秒） */
  throttleMs?: number;
  /** 每次播放结束后的额外冷却时间（毫秒） */
  cooldownAfterEndMs?: number;
};

type HoverHandlers = {
  onMouseEnter: MouseEventHandler;
  onFocus: FocusEventHandler;
  onTouchStart: TouchEventHandler;
};

const DEFAULT_SRC = "/assets/audios/hover.m4a";
const DEFAULT_VOLUME = 1;
const DEFAULT_PLAYBACK_RATE = 1;
const DEFAULT_PLAY_FROM_START = true;
const DEFAULT_THROTTLE_MS = 60;
const DEFAULT_COOLDOWN_AFTER_END_MS = 500;

export function useHoverSound(opts: UseHoverSoundOptions = {}): HoverHandlers {
  const {
    src = DEFAULT_SRC,
    volume = DEFAULT_VOLUME,
    playbackRate = DEFAULT_PLAYBACK_RATE,
    playFromStart = DEFAULT_PLAY_FROM_START,
    throttleMs = DEFAULT_THROTTLE_MS,
    cooldownAfterEndMs = DEFAULT_COOLDOWN_AFTER_END_MS,
  } = opts;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayTsRef = useRef(0);
  const unlockedRef = useRef(false);
  const isCoolingRef = useRef(false);
  const cooldownTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = Math.min(Math.max(volume, 0), 1);
    audio.playbackRate = playbackRate;
    audioRef.current = audio;

    const handleEnded = () => {
      if (cooldownTimerRef.current !== null) {
        window.clearTimeout(cooldownTimerRef.current);
      }
      cooldownTimerRef.current = window.setTimeout(() => {
        isCoolingRef.current = false;
        cooldownTimerRef.current = null;
      }, cooldownAfterEndMs);
    };

    const handleError = () => {
      isCoolingRef.current = false;
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      if (cooldownTimerRef.current !== null) {
        window.clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      audio.pause();
      audio.src = "";
      audioRef.current = null;
      isCoolingRef.current = false;
    };
  }, [src, volume, playbackRate, cooldownAfterEndMs]);

  useEffect(() => {
    const tryUnlock = () => {
      if (unlockedRef.current) return;
      const audio = audioRef.current;
      if (!audio) return;

      audio.muted = true;
      void audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          unlockedRef.current = true;
        })
        .catch(() => {
          // 如果仍被策略拦截，保持未解锁状态，等待下次交互
        })
        .finally(() => {
          audio.muted = false;
        });
    };

    const handlePointerDown = () => tryUnlock();
    const handleKeyDown = () => tryUnlock();

    window.addEventListener("pointerdown", handlePointerDown, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);

  const play = () => {
    if (isCoolingRef.current) return;

    const now = performance.now();
    if (now - lastPlayTsRef.current < throttleMs) return;
    lastPlayTsRef.current = now;

    const audio = audioRef.current;
    if (!audio) return;

    if (playFromStart) {
      try {
        audio.currentTime = 0;
      } catch {
        // 某些音频编解码在频繁设置 currentTime 时可能抛错，忽略即可
      }
    }

    isCoolingRef.current = true;
    if (cooldownTimerRef.current !== null) {
      window.clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }

    void audio.play().catch(() => {
      // 被自动播放策略拦截时静默失败，待解锁后可再次播放
      isCoolingRef.current = false;
    });
  };

  const handleMouseEnter: MouseEventHandler = () => {
    play();
  };

  const handleFocus: FocusEventHandler = () => {
    play();
  };

  const handleTouchStart: TouchEventHandler = () => {
    play();
  };

  return {
    onMouseEnter: handleMouseEnter,
    onFocus: handleFocus,
    onTouchStart: handleTouchStart,
  };
}

