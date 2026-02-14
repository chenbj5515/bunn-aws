'use client';

import { useRef, useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  currentVideoIdAtom,
  currentVideoTitleAtom,
  filteredVideosAtom,
  isSelectingAtom,
  videoListOpenAtom,
  selectorPositionAtom,
  setSelectingAtom,
  setVideoListOpenAtom,
  filterVideosAtom,
} from '../_store';

/**
 * 视频搜索 hook
 * 封装搜索栏的所有状态和逻辑
 */
export function useVideoSearch() {
  const inputRef = useRef<HTMLInputElement>(null);

  // 读取状态
  const currentVideoId = useAtomValue(currentVideoIdAtom);
  const currentVideoTitle = useAtomValue(currentVideoTitleAtom);
  const filteredVideos = useAtomValue(filteredVideosAtom);
  const isSelecting = useAtomValue(isSelectingAtom);
  const isListOpen = useAtomValue(videoListOpenAtom);
  const position = useAtomValue(selectorPositionAtom);

  // 写入状态
  const setSelecting = useSetAtom(setSelectingAtom);
  const setListOpen = useSetAtom(setVideoListOpenAtom);
  const filterVideos = useSetAtom(filterVideosAtom);

  // 进入搜索模式
  const enterSearchMode = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSelecting({
      isSelecting: true,
      position: {
        top: rect.bottom + window.scrollY + 5,
        left: rect.left,
        width: Math.max(rect.width, 320),
      },
    });
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [setSelecting]);

  // 退出搜索模式
  const exitSearchMode = useCallback(() => {
    setListOpen(false);
    setSelecting({ isSelecting: false });
  }, [setListOpen, setSelecting]);

  // 处理搜索输入
  const handleSearch = useCallback((text: string) => {
    filterVideos(text);
  }, [filterVideos]);

  // 处理输入框聚焦
  const handleFocus = useCallback(() => {
    setListOpen(true);
  }, [setListOpen]);

  // 处理输入框失焦
  const handleBlur = useCallback(() => {
    // 延迟处理，给点击列表项足够时间
    setTimeout(() => {
      if (!isListOpen) {
        setSelecting({ isSelecting: false });
      }
    }, 150);
  }, [isListOpen, setSelecting]);

  return {
    // Refs
    inputRef,
    // State
    currentVideoId,
    currentVideoTitle,
    filteredVideos,
    isSelecting,
    isListOpen,
    position,
    // Actions
    enterSearchMode,
    exitSearchMode,
    handleSearch,
    handleFocus,
    handleBlur,
  };
}
