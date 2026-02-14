'use client';

import { useEffect, useRef } from 'react';
import { createKeyboardHandler } from '../../../_utils/keyboard-utils';
import {
  store,
  videoListOpenAtom,
  isSelectingAtom,
  showMemoCardAtom,
  isCapturingAtom,
  currentVideoIdAtom,
  startCaptureAtom,
  videoPlayerRefAtom,
} from '../../../_store';

/**
 * 键盘控制 Hook
 * 处理视频播放、截屏等键盘快捷键
 * 
 * 实现细节：
 * - 监听 document keydown 事件处理键盘快捷键
 * - 监听 window blur 事件，当 iframe 获得焦点时自动将焦点移回父页面
 *   这样无论用户点击 YouTube iframe 还是页面其他地方，键盘快捷键都能正常工作
 */
export function useKeyboardControl(): void {
  // 用于接收焦点的隐藏元素
  const focusTargetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 创建隐藏的可聚焦元素
    const focusTarget = document.createElement('div');
    focusTarget.tabIndex = -1;
    focusTarget.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;opacity:0;pointer-events:none;';
    focusTarget.setAttribute('aria-hidden', 'true');
    document.body.appendChild(focusTarget);
    focusTargetRef.current = focusTarget;

    const handler = createKeyboardHandler({
      getPlayer: () => store.get(videoPlayerRefAtom),
      getLockState: () => ({
        videoListOpen: store.get(videoListOpenAtom),
        isSelecting: store.get(isSelectingAtom),
        showMemoCard: store.get(showMemoCardAtom),
        isCapturingSubtitle: store.get(isCapturingAtom),
      }),
      onCapture: () => {
        const currentVideoId = store.get(currentVideoIdAtom);
        if (currentVideoId) {
          store.set(startCaptureAtom, currentVideoId);
        }
      },
    });

    // 当 window 失去焦点（通常是 iframe 获得焦点）时，将焦点移回父页面
    const handleWindowBlur = () => {
      // 使用 requestAnimationFrame 确保在 blur 事件完成后执行
      requestAnimationFrame(() => {
        // 检查当前焦点是否在 iframe 中（activeElement 为 iframe 或 null）
        const activeElement = document.activeElement;
        if (activeElement?.tagName === 'IFRAME' || activeElement === document.body) {
          focusTargetRef.current?.focus();
        }
      });
    };

    document.addEventListener('keydown', handler);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('keydown', handler);
      window.removeEventListener('blur', handleWindowBlur);
      focusTarget.remove();
    };
  }, []);
}
