'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useMusicContext } from '../../_components/music-provider';

interface MusicTitleBarProps {
  currentVideoId: string;
  currentVideoTitle: string | null;
}

export function MusicTitleBar({ currentVideoId, currentVideoTitle }: MusicTitleBarProps) {
  const t = useTranslations('music.titleBar');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const inputRef = useRef<HTMLInputElement>(null);

  const { musicVideosList } = useMusicContext();

  const [isSelecting, setIsSelecting] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filteredVideos = useMemo(() => {
    if (!searchText.trim()) {
      return musicVideosList;
    }
    const lowerSearch = searchText.toLowerCase();
    return musicVideosList.filter(
      (video) => video.videoTitle?.toLowerCase().includes(lowerSearch)
    );
  }, [musicVideosList, searchText]);

  const enterSearchMode = useCallback(() => {
    setIsSelecting(true);
    setIsListOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const exitSearchMode = useCallback(() => {
    setIsListOpen(false);
    setIsSelecting(false);
    setSearchText('');
  }, []);

  const handleVideoSelect = useCallback(
    (videoId: string) => {
      router.push(`/${locale}/music/${encodeURIComponent(videoId)}`);
      exitSearchMode();
    },
    [router, locale, exitSearchMode]
  );

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  const handleFocus = useCallback(() => {
    setIsListOpen(true);
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (!isListOpen) {
        setIsSelecting(false);
        setSearchText('');
      }
    }, 150);
  }, [isListOpen]);

  const showTitle = currentVideoId && currentVideoTitle && !isSelecting;

  return (
    <div className="top-[50px] left-1/2 z-1001 absolute -translate-x-1/2">
      <div className="flex justify-center items-center min-h-10 font-sans">
        {showTitle ? (
          <div className="cursor-pointer group" onClick={enterSearchMode}>
            <h2 className="flex justify-center items-center font-bold text-xl">
              {currentVideoTitle}
            </h2>
          </div>
        ) : (
          <div className="relative flex items-center w-[360px]">
            <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-500 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              className="bg-white focus:shadow-neumorphic-button-hover py-2 pr-3 pl-9 rounded-full focus:outline-none w-full h-9 text-sm transition-shadow"
              placeholder={t('searchPlaceholder')}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        )}
      </div>

      {/* 视频列表下拉 */}
      {isListOpen && (
        <MusicVideoList
          videos={filteredVideos}
          currentVideoId={currentVideoId}
          onSelect={handleVideoSelect}
          onClose={exitSearchMode}
        />
      )}
    </div>
  );
}

interface MusicVideoListProps {
  videos: { videoId: string; videoTitle: string }[];
  currentVideoId: string;
  onSelect: (videoId: string) => void;
  onClose: () => void;
}

function MusicVideoList({ videos, currentVideoId, onSelect, onClose }: MusicVideoListProps) {
  const t = useTranslations('music.titleBar');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={listRef}
      className="top-[40px] left-0 z-1050 absolute bg-white/20 slide-in-from-top-2 shadow-xl backdrop-blur-md border border-white/20 rounded-2xl w-full max-h-[300px] overflow-hidden font-sans animate-in duration-200 fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-2">
        <div className="max-h-[280px] overflow-y-auto">
          {videos.length > 0 ? (
            <ul className="space-y-1">
              {videos.map((video) => (
                <li
                  key={video.videoId}
                  className={`text-left text-[14px] p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/30 text-black
                    ${video.videoId === currentVideoId ? 'bg-white/40 font-medium shadow-sm' : 'hover:shadow-sm'}`}
                  onClick={() => onSelect(video.videoId)}
                >
                  <p className="truncate">{video.videoTitle || t('untitled')}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-4 text-black text-center">
              {t('noResults')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
