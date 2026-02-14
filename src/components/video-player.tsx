"use client";

import Script from "next/script";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

// ============================================
// 类型定义
// ============================================

declare global {
  interface Window {
    YT: {
      Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(volume: number): void;
  getVolume(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
  getIframe(): HTMLIFrameElement;
}

interface YTPlayerOptions {
  width?: number | string;
  height?: number | string;
  videoId?: string;
  playerVars?: Record<string, unknown>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { target: YTPlayer; data: number }) => void;
    onError?: (event: { target: YTPlayer; data: number }) => void;
  };
}

// ============================================
// 常量
// ============================================

const YOUTUBE_IFRAME_API_URL = "https://www.youtube.com/iframe_api";

const DEFAULT_PLAYER_VARS = {
  rel: 0,
  modestbranding: 1,
  playsinline: 1,
  controls: 1,
  fs: 0,
  iv_load_policy: 3,
  cc_load_policy: 0,
  enablejsapi: 1,
  autoplay: 0,
  mute: 1,
  disablekb: 1, // 禁用 YouTube 内置键盘控制，由父页面统一处理
};

// ============================================
// 工具函数
// ============================================

function safePlayerCall<T>(
  player: YTPlayer | null,
  method: keyof YTPlayer,
  ...args: unknown[]
): T | undefined {
  if (!player) return undefined;
  try {
    const fn = player[method];
    if (typeof fn === "function") {
      return (fn as (...args: unknown[]) => T).apply(player, args);
    }
  } catch (e) {
    console.warn(`YouTube player method ${method} failed:`, e);
  }
  return undefined;
}

interface ParsedYouTubeUrl {
  videoId: string | null;
  startSec: number;
  endSec: number | null;
}

function parseYouTubeUrl(url: string): ParsedYouTubeUrl {
  if (!url) return { videoId: null, startSec: 0, endSec: null };

  try {
    const parsed = new URL(url);
    let videoId: string | null = null;

    // youtube.com/watch?v=VIDEO_ID
    if (parsed.hostname.includes("youtube.com") && parsed.pathname === "/watch") {
      videoId = parsed.searchParams.get("v");
    }
    // youtu.be/VIDEO_ID
    else if (parsed.hostname === "youtu.be") {
      const pathId = parsed.pathname.slice(1).split("/")[0];
      videoId = pathId || null;
    }
    // youtube.com/embed/VIDEO_ID 或 youtube.com/v/VIDEO_ID
    else if (parsed.hostname.includes("youtube.com")) {
      const match = parsed.pathname.match(/^\/(embed|v)\/([^/?]+)/);
      if (match?.[2]) {
        videoId = match[2];
      }
    }

    // 解析时间参数
    const parseTimeParam = (param: string | null): number | null => {
      if (!param) return null;
      if (param.includes("m") || param.includes("s")) {
        const minutes = param.match(/(\d+)m/)?.[1] || "0";
        const seconds = param.match(/(\d+)s/)?.[1] || "0";
        return parseInt(minutes) * 60 + parseInt(seconds);
      }
      const num = parseInt(param);
      return isNaN(num) ? null : num;
    };

    const tParam = parsed.searchParams.get("t") || parsed.searchParams.get("start");
    const startSec = parseTimeParam(tParam) ?? 0;

    const endParam = parsed.searchParams.get("end");
    const endSec = parseTimeParam(endParam);

    return { videoId, startSec, endSec };
  } catch {
    return { videoId: null, startSec: 0, endSec: null };
  }
}

// ============================================
// 组件
// ============================================

export interface VideoPlayerHandle {
  pauseVideo: () => void;
  playVideo: () => void;
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (time: number, allowSeekAhead?: boolean) => void;
  mute: () => void;
  unMute: () => void;
}

interface VideoPlayerProps {
  url: string;
  /** 是否显示播放器控件，默认 true */
  showControls?: boolean;
  /** 播放器准备就绪回调 */
  onReady?: () => void;
  /** 播放状态变化回调 */
  onStateChange?: (state: number) => void;
  /** 播放器错误回调 */
  onError?: (errorCode: number) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer(props, ref) {
    const { url, showControls = true, onReady, onStateChange, onError } = props;

    const { videoId, startSec } = parseYouTubeUrl(url);

    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YTPlayer | null>(null);

    // 暴露控制方法给父组件
    useImperativeHandle(ref, () => ({
      pauseVideo: () => safePlayerCall(playerRef.current, "pauseVideo"),
      playVideo: () => safePlayerCall(playerRef.current, "playVideo"),
      getPlayerState: () => safePlayerCall<number>(playerRef.current, "getPlayerState") ?? -1,
      getCurrentTime: () => safePlayerCall<number>(playerRef.current, "getCurrentTime") ?? 0,
      getDuration: () => safePlayerCall<number>(playerRef.current, "getDuration") ?? 0,
      seekTo: (time: number, allowSeekAhead = true) => {
        safePlayerCall(playerRef.current, "seekTo", time, allowSeekAhead);
      },
      mute: () => safePlayerCall(playerRef.current, "mute"),
      unMute: () => safePlayerCall(playerRef.current, "unMute"),
    }));

    // 初始化播放器
    useEffect(() => {
      if (!containerRef.current || !videoId) return;

      const createPlayer = () => {
        if (!window.YT?.Player || !containerRef.current) return;

        playerRef.current = new window.YT.Player(containerRef.current, {
          width: "100%",
          height: "100%",
          videoId,
          playerVars: {
            ...DEFAULT_PLAYER_VARS,
            controls: showControls ? 1 : 0,
            start: startSec || undefined,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              safePlayerCall(playerRef.current, "unMute");
              onReady?.();
            },
            onStateChange: (event) => {
              onStateChange?.(event.data);
            },
            onError: (event) => {
              console.error("YouTube Player Error:", event.data);
              onError?.(event.data);
            },
          },
        });
      };

      // 处理脚本已加载/未加载两种情况
      if (window.YT?.Player) {
        createPlayer();
      } else {
        const prevCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          prevCallback?.();
          createPlayer();
        };
      }

      return () => {
        if (playerRef.current) {
          safePlayerCall(playerRef.current, "destroy");
          playerRef.current = null;
        }
      };
    }, [videoId]);

    if (!videoId) {
      return (
        <div className="flex justify-center items-center h-full">
          <p className="text-gray-500">无效的视频链接</p>
        </div>
      );
    }

    return (
      <>
        <Script src={YOUTUBE_IFRAME_API_URL} strategy="afterInteractive" />
        <div
          ref={containerRef}
          id={`channel-player-${videoId}`}
          className="w-full [&>iframe]:w-full h-full [&>iframe]:h-full"
        />
      </>
    );
  }
);
