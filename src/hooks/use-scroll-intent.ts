'use client';

import { useEffect, useRef } from 'react';

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

export interface ScrollIntentOptions {
  /** 触发回调的阈值（像素） */
  threshold?: number;
  /** 是否启用 */
  enabled?: boolean;
  /** 防抖时间（毫秒） */
  debounceMs?: number;
  /** 只监听垂直滚动 */
  verticalOnly?: boolean;
  /** 只监听水平滚动 */
  horizontalOnly?: boolean;
}

export interface UseScrollIntentReturn {
  /** 当前滚动方向 */
  direction: ScrollDirection | null;
  /** 是否正在滚动 */
  isScrolling: boolean;
  /** 重置滚动状态 */
  reset: () => void;
}

/**
 * 检测用户的滚动意图的自定义Hook
 * 不依赖页面滚动条，通过触摸和鼠标滚轮事件检测意图
 */
export function useScrollIntent(
  onScroll: (direction: ScrollDirection, delta: number) => void,
  options: ScrollIntentOptions = {}
): UseScrollIntentReturn {
  const {
    threshold = 50,
    enabled = true,
    debounceMs = 300,
    verticalOnly = true,
    horizontalOnly = false,
  } = options;

  const directionRef = useRef<ScrollDirection | null>(null);
  const isScrollingRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef(0);
  const accumulatedDeltaRef = useRef({ x: 0, y: 0 });

  // 重置状态
  const reset = () => {
    directionRef.current = null;
    isScrollingRef.current = false;
    accumulatedDeltaRef.current = { x: 0, y: 0 };
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  };

  // 处理滚轮事件
  const handleWheel = (event: WheelEvent) => {
    if (!enabled) return;

    event.preventDefault();

    const now = Date.now();
    const timeSinceLastScroll = now - lastScrollTimeRef.current;

    // 如果距离上次滚动时间太短，累积delta
    if (timeSinceLastScroll < 100) {
      accumulatedDeltaRef.current.x += event.deltaX;
      accumulatedDeltaRef.current.y += event.deltaY;
    } else {
      // 重置累积值
      accumulatedDeltaRef.current = { x: event.deltaX, y: event.deltaY };
    }

    lastScrollTimeRef.current = now;

    let direction: ScrollDirection | null = null;
    let shouldTrigger = false;

    // 检查垂直滚动
    if (!horizontalOnly && Math.abs(accumulatedDeltaRef.current.y) > threshold) {
      direction = accumulatedDeltaRef.current.y > 0 ? 'down' : 'up';
      shouldTrigger = true;
    }
    // 检查水平滚动（如果启用）
    else if (!verticalOnly && Math.abs(accumulatedDeltaRef.current.x) > threshold) {
      direction = accumulatedDeltaRef.current.x > 0 ? 'right' : 'left';
      shouldTrigger = true;
    }

    if (shouldTrigger && direction) {
      directionRef.current = direction;
      isScrollingRef.current = true;

      // 清除之前的防抖定时器
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // 调用回调
      onScroll(direction, verticalOnly ? accumulatedDeltaRef.current.y : accumulatedDeltaRef.current.x);

      // 设置防抖定时器
      debounceTimeoutRef.current = setTimeout(() => {
        reset();
      }, debounceMs);
    }
  };

  // 处理触摸事件
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (event: TouchEvent) => {
    if (!enabled || !event.touches[0]) return;

    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (!enabled || !touchStartRef.current || !event.touches[0]) return;

    event.preventDefault();

    const touch = event.touches[0];
    const deltaX = touchStartRef.current.x - touch.clientX;
    const deltaY = touchStartRef.current.y - touch.clientY;

    let direction: ScrollDirection | null = null;
    let shouldTrigger = false;

    // 检查垂直触摸滚动
    if (!horizontalOnly && Math.abs(deltaY) > threshold) {
      direction = deltaY > 0 ? 'down' : 'up';
      shouldTrigger = true;
    }
    // 检查水平触摸滚动（如果启用）
    else if (!verticalOnly && Math.abs(deltaX) > threshold) {
      direction = deltaX > 0 ? 'right' : 'left';
      shouldTrigger = true;
    }

    if (shouldTrigger && direction) {
      directionRef.current = direction;
      isScrollingRef.current = true;

      // 清除之前的防抖定时器
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // 调用回调
      onScroll(direction, verticalOnly ? deltaY : deltaX);

      // 设置防抖定时器
      debounceTimeoutRef.current = setTimeout(() => {
        reset();
      }, debounceMs);

      // 重置触摸起始点
      touchStartRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  // 设置事件监听器
  useEffect(() => {
    if (!enabled) return;

    // 添加事件监听器
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      // 清理事件监听器
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);

      // 清理定时器
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [enabled, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    direction: directionRef.current,
    isScrolling: isScrollingRef.current,
    reset,
  };
}
