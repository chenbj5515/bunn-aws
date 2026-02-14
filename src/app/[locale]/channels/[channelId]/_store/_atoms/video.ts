import { atom } from "jotai";
import type { VideoPlayerHandle } from "@/components/video-player";
import type { VideoViewerState, VideoInfo } from "../types";
import { createInitialVideoViewerState } from "../types";

// ============================================
// 播放器引用
// ============================================

/**
 * 视频播放器引用（用于外部控制播放器）
 */
export const videoPlayerRefAtom = atom<VideoPlayerHandle | null>(null);

// ============================================
// 核心状态
// ============================================

/**
 * 视频查看器状态
 */
export const videoViewerStateAtom = atom<VideoViewerState>(
  createInitialVideoViewerState('', null, [])
);

// ============================================
// 派生状态
// ============================================

/** 当前视频 ID */
export const currentVideoIdAtom = atom((get) => get(videoViewerStateAtom).currentVideoId);

/** 当前视频标题 */
export const currentVideoTitleAtom = atom((get) => get(videoViewerStateAtom).currentVideoTitle);

/** 视频列表 */
export const videosAtom = atom((get) => get(videoViewerStateAtom).videos);

/** 过滤后的视频列表 */
export const filteredVideosAtom = atom((get) => get(videoViewerStateAtom).filteredVideos);

/** 视频时长 */
export const videoDurationAtom = atom((get) => get(videoViewerStateAtom).videoDuration);

/** 是否暂停 */
export const isVideoPausedAtom = atom((get) => get(videoViewerStateAtom).isVideoPaused);

/** 是否播放过 */
export const hasEverPlayedAtom = atom((get) => get(videoViewerStateAtom).hasEverPlayed);

/** 视频列表是否打开 */
export const videoListOpenAtom = atom((get) => get(videoViewerStateAtom).videoListOpen);

/** 是否正在选择 */
export const isSelectingAtom = atom((get) => get(videoViewerStateAtom).isSelecting);

/** 选择器位置 */
export const selectorPositionAtom = atom((get) => get(videoViewerStateAtom).selectorPosition);

// ============================================
// Action Atoms
// ============================================

/**
 * 初始化视频查看器状态
 */
export const initializeVideoViewerAtom = atom(
  null,
  (_get, set, payload: { videoId: string; videoTitle: string | null; videos: VideoInfo[] }) => {
    set(videoViewerStateAtom, createInitialVideoViewerState(
      payload.videoId,
      payload.videoTitle,
      payload.videos
    ));
  }
);

/**
 * 设置当前视频
 */
export const setCurrentVideoAtom = atom(
  null,
  (get, set, payload: { videoId: string; videoTitle: string | null }) => {
    const state = get(videoViewerStateAtom);
    set(videoViewerStateAtom, {
      ...state,
      currentVideoId: payload.videoId,
      currentVideoTitle: payload.videoTitle,
      videoListOpen: false,
      isSelecting: false,
    });
  }
);

/**
 * 设置视频时长
 */
export const setVideoDurationAtom = atom(
  null,
  (get, set, duration: number) => {
    const state = get(videoViewerStateAtom);
    if (duration !== state.videoDuration) {
      set(videoViewerStateAtom, { ...state, videoDuration: duration });
    }
  }
);

/**
 * 设置播放状态
 */
export const setPlayStateAtom = atom(
  null,
  (get, set, payload: { isPaused: boolean; hasPlayed?: boolean }) => {
    const state = get(videoViewerStateAtom);
    set(videoViewerStateAtom, {
      ...state,
      isVideoPaused: payload.isPaused,
      hasEverPlayed: payload.hasPlayed ?? state.hasEverPlayed,
    });
  }
);

/**
 * 设置视频列表打开状态
 */
export const setVideoListOpenAtom = atom(
  null,
  (get, set, isOpen: boolean) => {
    const state = get(videoViewerStateAtom);
    set(videoViewerStateAtom, {
      ...state,
      videoListOpen: isOpen,
      isSelecting: isOpen ? state.isSelecting : false,
    });
  }
);

/**
 * 设置选择状态
 */
export const setSelectingAtom = atom(
  null,
  (get, set, payload: { isSelecting: boolean; position?: { top: number; left: number; width: number } }) => {
    const state = get(videoViewerStateAtom);
    set(videoViewerStateAtom, {
      ...state,
      isSelecting: payload.isSelecting,
      selectorPosition: payload.position ?? state.selectorPosition,
      videoListOpen: payload.isSelecting,
    });
  }
);

/**
 * 过滤视频列表
 */
export const filterVideosAtom = atom(
  null,
  (get, set, searchText: string) => {
    const state = get(videoViewerStateAtom);
    if (!searchText.trim()) {
      set(videoViewerStateAtom, { ...state, filteredVideos: state.videos });
      return;
    }
    const q = searchText.toLowerCase().trim();
    set(videoViewerStateAtom, {
      ...state,
      filteredVideos: state.videos.filter(v => (v.videoTitle || '').toLowerCase().includes(q)),
    });
  }
);
