"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { useAtomValue } from "jotai";
import { VideoPlayer as BaseVideoPlayer, VideoPlayerHandle } from "@/components/video-player";
import {
  store,
  TaskPhase,
  currentPhaseAtom,
  completePlayAtom,
} from "../_store";

// 导出 handle 类型供外部使用
export interface DailyTaskVideoPlayerHandle {
  /** 在用户交互时调用以解锁音频 */
  unlockAudio: () => void;
}

// 每轮播放次数
const MAX_PLAY_COUNT = 3;

// 默认视频片段持续时间（秒），当 URL 没有 end 参数时使用
const DEFAULT_SEGMENT_DURATION = 8;

// 视频播放偏移量（秒），用于提前播放
const VIDEO_PLAYBACK_OFFSET = 1.5;

// ============================================
// URL 解析
// ============================================

interface ParsedUrl {
  startSec: number;
  endSec: number | null;
}

function parseTimeParam(param: string | null): number | null {
  if (!param) return null;
  if (param.includes("m") || param.includes("s")) {
    const minutes = param.match(/(\d+)m/)?.[1] || "0";
    const seconds = param.match(/(\d+)s/)?.[1] || "0";
    return parseInt(minutes) * 60 + parseInt(seconds);
  }
  const parsed = parseInt(param);
  return isNaN(parsed) ? null : parsed;
}

function parseUrl(input: string): ParsedUrl {
  try {
    const urlObj = new URL(input);
    const tParam = urlObj.searchParams.get("t") || urlObj.searchParams.get("start");
    const startTime = parseTimeParam(tParam) ?? 0;
    const endParam = urlObj.searchParams.get("end");
    const endTime = parseTimeParam(endParam);

    const adjustedStart = Math.max(0, startTime - VIDEO_PLAYBACK_OFFSET);
    const adjustedEnd = endTime !== null ? Math.max(0, endTime - VIDEO_PLAYBACK_OFFSET) : null;

    return { startSec: adjustedStart, endSec: adjustedEnd };
  } catch {
    return { startSec: 0, endSec: null };
  }
}

// ============================================
// 核心播放逻辑
// ============================================

interface PlaySegmentOptions {
  player: VideoPlayerHandle;
  startSec: number;
  endTime: number;
  signal: AbortSignal;
}

/** 播放一个片段（从 startSec 到 endTime），返回 Promise */
function playSegment({ player, startSec, endTime, signal }: PlaySegmentOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    player.seekTo(startSec, true);
    player.unMute();
    player.playVideo();

    const checkInterval = setInterval(() => {
      if (signal.aborted) {
        clearInterval(checkInterval);
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }

      const currentTime = player.getCurrentTime();
      if (currentTime >= endTime) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);

    signal.addEventListener("abort", () => clearInterval(checkInterval));
  });
}

interface PlayLoopOptions {
  player: VideoPlayerHandle;
  startSec: number;
  endTime: number;
  times: number;
  signal: AbortSignal;
  onSegmentComplete: () => void;
  onLoopComplete: () => void;
}

/** 播放 N 次循环 */
async function playLoop({
  player,
  startSec,
  endTime,
  times,
  signal,
  onSegmentComplete,
  onLoopComplete,
}: PlayLoopOptions): Promise<void> {
  for (let i = 0; i < times; i++) {
    if (signal.aborted) return;

    await playSegment({ player, startSec, endTime, signal });

    if (i < times - 1) {
      onSegmentComplete();
    }
  }

  player.pauseVideo();
  onLoopComplete();
}

// ============================================
// 组件
// ============================================

interface VideoPlayerProps {
  url: string;
}

export const VideoPlayer = forwardRef<DailyTaskVideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ url }, ref) {
    const phase = useAtomValue(currentPhaseAtom);
    const playerRef = useRef<VideoPlayerHandle | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const { startSec, endSec } = parseUrl(url);
    // 如果 URL 没有 end 参数，使用默认持续时间
    const endTime = endSec ?? startSec + DEFAULT_SEGMENT_DURATION;

    // ============================================
    // 暴露给父组件的方法
    // ============================================

    useImperativeHandle(ref, () => ({
      /**
       * 在用户交互（如点击开始按钮）时调用此方法
       * 用于解锁浏览器的音频播放限制
       * 必须在用户手势的同步调用栈中调用
       */
      unlockAudio: () => {
        const player = playerRef.current;
        if (player) {
          // 在用户手势上下文中调用 unMute 来解锁音频
          player.unMute();
        }
      },
    }));

    // ============================================
    // 播放控制
    // ============================================

    const startPlayback = () => {
      const player = playerRef.current;
      if (!player) return;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      playLoop({
        player,
        startSec,
        endTime,
        times: MAX_PLAY_COUNT,
        signal: controller.signal,
        onSegmentComplete: () => store.set(completePlayAtom),
        onLoopComplete: () => store.set(completePlayAtom),
      }).catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Playback error:", err);
        }
      });
    };

    const stopPlayback = () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      playerRef.current?.pauseVideo();
    };

    // ============================================
    // 响应 phase 变化
    // ============================================

    useEffect(() => {
      if (phase !== TaskPhase.PLAYING) {
        stopPlayback();
      }
    }, [phase]);

    // 播放器准备就绪时，如果当前是 PLAYING 状态则开始播放
    const handleReady = () => {
      if (store.get(currentPhaseAtom) === TaskPhase.PLAYING) {
        startPlayback();
      }
    };

    return (
      <BaseVideoPlayer
        ref={playerRef}
        url={url}
        showControls={false}
        onReady={handleReady}
      />
    );
  }
);
