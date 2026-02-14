"use client";
import { useTranslations } from 'next-intl';
import { FC, useState, useEffect, useRef } from 'react';

export interface VideoInfo {
  videoId: string;
  videoTitle: string | null;
}

export const VideoList: FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (videoId: string, videoTitle: string | null) => void;
  videos: VideoInfo[];
  currentVideoId?: string;
  position?: { top: number; left: number; width: number };
}> = ({ isOpen, onClose, onSelect, videos, currentVideoId, position }) => {
  const t = useTranslations('VideoSelector');
  const selectorRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭弹窗
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSelect = (videoId: string, videoTitle: string | null) => {
    onSelect(videoId, videoTitle);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={selectorRef}
      className="top-[40px] left-0 z-1050 absolute bg-white/20 slide-in-from-top-2 shadow-xl backdrop-blur-md border border-white/20 rounded-2xl w-full max-h-[300px] overflow-hidden font-sans animate-in duration-200 fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-2">
        {/* 视频列表 */}
        <div className="max-h-[280px] overflow-y-auto">
          {videos.length > 0 ? (
            <ul className="space-y-1">
              {videos.map((video) => (
                <li
                  key={video.videoId}
                  className={`text-left text-[14px] p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/30 text-black
                    ${video.videoId === currentVideoId ? 'bg-white/40 font-medium shadow-sm' : 'hover:shadow-sm'}`}
                  onClick={() => handleSelect(video.videoId, video.videoTitle)}
                >
                  <p className="truncate">{video.videoTitle || '无标题'}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-4 text-black text-center">
              {t('noResults', { fallback: "没有找到匹配的视频" })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};