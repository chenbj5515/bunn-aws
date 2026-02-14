"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

function parseYouTubeUrl(input: string) {
  try {
    const urlObj = new URL(input);
    const videoId = urlObj.searchParams.get('v') || input.split('youtu.be/')[1]?.split('?')[0] || '';
    let startTime = 0;
    const tParam = urlObj.searchParams.get('t');
    if (tParam) {
      if (tParam.includes('m') || tParam.includes('s')) {
        const minutes = tParam.match(/(\d+)m/)?.[1] || '0';
        const seconds = tParam.match(/(\d+)s/)?.[1] || '0';
        startTime = parseInt(minutes) * 60 + parseInt(seconds);
      } else {
        startTime = parseInt(tParam) || 0;
      }
    }
    return { videoId, startSec: startTime };
  } catch {
    return { videoId: '', startSec: 0 };
  }
}

export interface Marker {
  id: string;
  contextUrl: string;
  avatarUrl?: string | null;
  title: string;
  order?: number; // 用于同时间错位
}

interface VideoProgressBarMultiProps {
  videoPlayerRef: {
    getCurrentTime: () => number;
    seekTo: (time: number, allowSeekAhead?: boolean) => void;
    getPlayerState: () => number;
    pauseVideo: () => void;
  } | null;
  duration?: number;
  visible?: boolean;
  width?: string;
  height?: string;
  markers: Marker[];
  onMarkerClick?: (markerId: string) => void;
}

export function VideoProgressBarMulti({
  videoPlayerRef,
  duration = 0,
  visible = true,
  width = "100%",
  height = "8px",
  markers = [],
  onMarkerClick
}: VideoProgressBarMultiProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [lastValidTime, setLastValidTime] = useState(0); // 保存最后一次有效的时间
  const [lastDragEndTime, setLastDragEndTime] = useState(0); // 最后一次拖拽结束的时间戳，用于防止回跳
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null); // 鼠标位置
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null); // 当前激活的标记ID（基于距离）
  const [lastSeekAt, setLastSeekAt] = useState(0); // 最近一次 seek 的时间戳，避免读取到瞬时0

  const getValidMarkers = useCallback(() => {
    return markers.filter((m) => {
      const { startSec } = parseYouTubeUrl(m.contextUrl);
      return startSec !== undefined && startSec !== null && startSec >= 0 && startSec <= duration;
    });
  }, [markers, duration]);

  const updateCurrentTime = useCallback(() => {
    if (videoPlayerRef && !isDragging) {
      // 如果刚刚完成拖拽（500ms内），跳过更新以避免回跳
      if (Date.now() - lastDragEndTime < 500) {
        return;
      }

      // 如果刚执行过 seek（例如点击标记或键盘快进），在短时间窗口内跳过读取，避免瞬时0
      if (Date.now() - lastSeekAt < 800) {
        return;
      }

      const time = videoPlayerRef.getCurrentTime();
      const isFiniteNumber = Number.isFinite(time);
      const inRange = isFiniteNumber && time >= 0 && time <= duration;

      // 把 time===0 视为“无效回读”，除非还没有任何有效时间
      if (inRange && (time > 0 || lastValidTime === 0)) {
        setCurrentTime(time);
        if (time > 0) setLastValidTime(time);
      } else if ((time === 0 || !inRange) && lastValidTime > 0) {
        setCurrentTime(lastValidTime);
      }
    }
  }, [videoPlayerRef, isDragging, duration, lastValidTime, lastDragEndTime]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !videoPlayerRef) return;
    setIsDragging(true);
    const progressBar = event.currentTarget.querySelector('[data-progress-container]') as HTMLElement;
    if (!progressBar) return;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = progress * duration;
    setDragTime(newTime);
  }, [duration, videoPlayerRef]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !duration) return;
    const container = document.querySelector('[data-progress-container]');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const moveX = event.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, moveX / rect.width));
    const newTime = progress * duration;
    setDragTime(newTime);
  }, [isDragging, duration]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !videoPlayerRef) return;
    setIsDragging(false);
    videoPlayerRef.seekTo(dragTime, true);
    setCurrentTime(dragTime);
    setLastDragEndTime(Date.now()); // 记录拖拽结束时间，用于防止回跳
    setLastSeekAt(Date.now()); // 记录最近一次 seek 时间
  }, [isDragging, videoPlayerRef, dragTime]);

  const handleMouseMoveOnProgress = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return; // 拖拽时不处理标记激活逻辑

    const progressBar = event.currentTarget.querySelector('[data-progress-container]') as HTMLElement;
    if (!progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    setMousePosition({ x: mouseX, y: mouseY });

    // 计算鼠标到每个标记的距离，找到最近的一个
    let closestMarkerId: string | null = null;
    let minDistance = Infinity;
    const activationThreshold = 60; // 激活距离阈值（像素）

    const currentValidMarkers = getValidMarkers();
    currentValidMarkers.forEach((m) => {
      const { startSec } = parseYouTubeUrl(m.contextUrl);
      const markerX = (startSec! / duration) * rect.width;
      const markerY = -45; // 标记的Y位置（相对于进度条中心）

      const distance = Math.sqrt(
        Math.pow(mouseX - markerX, 2) + Math.pow(mouseY - markerY, 2)
      );

      if (distance < activationThreshold && distance < minDistance) {
        minDistance = distance;
        closestMarkerId = m.id;
      }
    });

    setActiveMarkerId(closestMarkerId);
  }, [isDragging, getValidMarkers, duration]);

  const handleMouseLeaveProgress = useCallback(() => {
    setMousePosition(null);
    setActiveMarkerId(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'pointer';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 移除对 videoPlayerRef 变化时的进度重置，避免出现回零闪烁

  useEffect(() => {
    if (!visible || !videoPlayerRef) return;
    const interval = setInterval(() => {
      updateCurrentTime();
    }, 100);
    return () => clearInterval(interval);
  }, [visible, videoPlayerRef, updateCurrentTime]);

  if (!visible || !duration) return null;

  const progress = isDragging ? (dragTime / duration) * 100 : (currentTime / duration) * 100;
  const displayTime = isDragging ? dragTime : currentTime;

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 直接遍历所有markers，简化逻辑
  const validMarkers = useMemo(() => {
    return markers.filter((m) => {
      const { startSec } = parseYouTubeUrl(m.contextUrl);
      return startSec !== undefined && startSec !== null && startSec >= 0 && startSec <= duration;
    });
  }, [markers, duration]);

  return (
    <div className="right-0 bottom-0 left-0 z-2000 fixed bg-linear-to-t from-[#000000CC] to-transparent p-4">{/* 叠加在最顶层 */}
      <div className="flex justify-center mx-auto max-w-5xl">
        <div
          className="relative py-3 cursor-pointer"
          style={{ width }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMoveOnProgress}
          onMouseLeave={handleMouseLeaveProgress}
        >
          <div
            data-progress-container
            className="group relative bg-white/20 rounded-full"
            style={{ width, height }}
          >
            <div className="absolute inset-0 bg-white/30 rounded-full" />
            <motion.div
              className="top-0 left-0 absolute rounded-full h-full"
              style={{
                width: progress > 0 ? `calc(${progress}% + 4px)` : '0%',
                marginLeft: progress > 0 ? '-2px' : '0px'
              }}
              transition={{ duration: isDragging ? 0 : 0.1 }}
            />
            <motion.div
              className="top-1/2 absolute bg-white shadow-lg rounded-full w-3 h-3 -translate-x-1/2 -translate-y-1/2 transform"
              style={{ left: `${progress}%` }}
              animate={{ scale: isDragging ? 1.2 : 1 }}
              transition={{ duration: 0.1 }}
            />

            <div className="top-1/2 -left-12 absolute font-sans text-white text-sm -translate-y-1/2">{formatTime(displayTime)}</div>
            <div className="top-1/2 -right-12 absolute font-sans text-white text-sm -translate-y-1/2">{formatTime(duration)}</div>

            {/* 多卡片标记 - 直接遍历所有有效markers */}
            {validMarkers.map((m, idx) => {
              const { startSec } = parseYouTubeUrl(m.contextUrl);
              const left = (startSec! / duration) * 100;
              const avatarUrl = m.avatarUrl;
              const isActive = activeMarkerId === m.id;
              const zIndex = isActive ? 4000 : 3000; // 激活的标记层级更高

              return (
                <div key={m.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${left}%`, top: '-45px', zIndex }}>
                  <div className={`relative flex justify-center items-center bg-white rounded-full w-[52px] h-[52px] transition-transform cursor-pointer ${isActive ? 'scale-110' : 'scale-100'}`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (videoPlayerRef) {
                        // 获取当前播放状态
                        const currentState = videoPlayerRef.getPlayerState();
                        // 跳转到标记时间点
                        videoPlayerRef.seekTo(startSec!, true);
                        // 立即更新本地 UI，避免短暂回到0再跳到目标，并设置 seek 保护窗口
                        setCurrentTime(startSec!);
                        setLastValidTime(startSec!);
                        setLastSeekAt(Date.now());
                        // 确保视频保持原来的播放状态（如果当前是暂停的，seekTo后仍然暂停）
                        // YouTube Player API 的 seekTo 不会改变播放状态，但这里添加保障措施
                        if (currentState === 2) { // 2 = paused
                          // 延迟一点时间再调用pause，确保seekTo完成
                          setTimeout(() => {
                            if (videoPlayerRef) {
                              videoPlayerRef.pauseVideo();
                            }
                          }, 50);
                        }
                      }
                      // 如果提供了onMarkerClick回调，调用它来展示记忆卡片
                      if (onMarkerClick) {
                        onMarkerClick(m.id);
                      }
                    }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={m.title || '头像'}
                        className="bg-white rounded-full w-[44px] h-[44px] object-cover"
                        style={{ zIndex: 2 }}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex justify-center items-center bg-gray-300 rounded-full w-[44px] h-[44px]" style={{ zIndex: 2 }}>
                        <span className="text-gray-600 text-xs">无</span>
                      </div>
                    )}
                    <div
                      className="left-1/2 absolute bg-white w-2 h-2 rotate-45 -translate-x-1/2 transform"
                      style={{ bottom: '-3px', zIndex: 1 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoProgressBarMulti;


