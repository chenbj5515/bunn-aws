'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Edit3, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { LyricLine } from '../page';
import type { Segment, WordSegmentationV2 } from '@/types/extended-memo-card';
import { WordCardAdder } from '@/components/memo-card/word-card-adder';
import {
  updateWordSegmentationRuby,
  updateWordSegmentationTranslation,
} from '@/components/memo-card/server-functions';

type SupportedLocale = 'en' | 'zh' | 'zh-TW';

interface LyricsOverlayProps {
  lyrics: LyricLine[];
  currentTime: number;
  isPlaying: boolean;
  videoTitle: string | null;
  onPlayPause: () => void;
  onSeekTo: (startTime: number, endTime?: number) => void;
  onClose: () => void;
  onEditClick?: () => void;
  canEdit: boolean;
  onLyricsUpdate?: (updatedLyrics: LyricLine[]) => void;
}

type TooltipAnchorRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

function parseTimeFromUrl(contextUrl: string | null): number {
  if (!contextUrl) return 0;

  try {
    const url = new URL(contextUrl);
    const tParam = url.searchParams.get('t');
    if (!tParam) return 0;

    if (tParam.includes('m') || tParam.includes('s')) {
      const minutes = tParam.match(/(\d+)m/)?.[1] || '0';
      const seconds = tParam.match(/(\d+)s/)?.[1] || '0';
      return parseInt(minutes) * 60 + parseInt(seconds);
    }

    return parseInt(tParam) || 0;
  } catch {
    return 0;
  }
}

export function LyricsOverlay({
  lyrics,
  currentTime,
  isPlaying,
  videoTitle,
  onPlayPause,
  onSeekTo,
  onClose,
  onEditClick,
  canEdit,
  onLyricsUpdate,
}: LyricsOverlayProps) {
  const locale = useLocale();
  const t = useTranslations('music.lyricsOverlay');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lyricRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [localLyrics, setLocalLyrics] = useState<LyricLine[]>(lyrics);
  const [activeTooltip, setActiveTooltip] = useState<{
    word: string;
    meaning: string;
    kanaPronunciation?: string;
    anchorRect: TooltipAnchorRect;
    lyricId: string;
    segmentIndex: number;
  } | null>(null);

  useEffect(() => {
    setLocalLyrics(lyrics);
  }, [lyrics]);

  const currentLyricIndex = useMemo(() => {
    if (lyrics.length === 0) return -1;

    for (let i = 0; i < lyrics.length; i++) {
      const lyric = lyrics[i];
      const startTime = parseTimeFromUrl(lyric.contextUrl);
      const endTime = lyric.endTimeMs ? lyric.endTimeMs / 1000 : null;

      const nextLyric = lyrics[i + 1];
      const nextStartTime = nextLyric ? parseTimeFromUrl(nextLyric.contextUrl) : Infinity;

      const effectiveEndTime = endTime ?? nextStartTime;

      if (currentTime >= startTime && currentTime < effectiveEndTime) {
        return i;
      }
    }

    return -1;
  }, [lyrics, currentTime]);

  const getTranslation = (translation: Record<string, string> | string): string => {
    if (typeof translation === 'string') return translation;
    if (locale === 'zh-TW') {
      return translation['zh-TW'] || translation.zh || '';
    }
    if (locale === 'zh') {
      return translation.zh || translation['zh-TW'] || '';
    }
    return translation.en || '';
  };

  const getSegmentTranslation = (segment: Segment): string => {
    if (!segment.translations) return '';
    const translations = segment.translations;
    if (locale === 'zh-TW' && !translations['zh-TW']) {
      return translations['zh'] || translations['en'] || '';
    }
    return translations[locale as keyof typeof translations] || translations['en'] || '';
  };

  const showTooltip = (segment: Segment, segmentIndex: number, lyricId: string, event: React.MouseEvent) => {
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const meaning = getSegmentTranslation(segment);

    setActiveTooltip({
      word: segment.word,
      meaning,
      kanaPronunciation: segment.ruby || undefined,
      anchorRect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
      lyricId,
      segmentIndex,
    });
  };

  const handleKanaPronunciationBlur = useCallback(
    async (segmentIndex: number, lyricId: string, nextRuby: string) => {
      const lyric = localLyrics.find((l) => l.id === lyricId);
      if (!lyric?.wordSegmentation?.segments) return;

      const updatedSegments = [...lyric.wordSegmentation.segments];
      updatedSegments[segmentIndex] = {
        ...updatedSegments[segmentIndex],
        ruby: nextRuby || undefined,
      };

      const updatedWordSegmentation: WordSegmentationV2 = {
        ...lyric.wordSegmentation,
        segments: updatedSegments,
        metadata: {
          ...lyric.wordSegmentation.metadata,
          source: 'manual',
        },
      };

      setLocalLyrics((prev) =>
        prev.map((l) =>
          l.id === lyricId ? { ...l, wordSegmentation: updatedWordSegmentation } : l
        )
      );

      if (onLyricsUpdate) {
        onLyricsUpdate(
          localLyrics.map((l) =>
            l.id === lyricId ? { ...l, wordSegmentation: updatedWordSegmentation } : l
          )
        );
      }

      try {
        await updateWordSegmentationRuby(lyricId, segmentIndex, nextRuby);
      } catch (error) {
        console.error('更新假名标注失败', error);
      }
    },
    [localLyrics, onLyricsUpdate]
  );

  const handleMeaningBlur = useCallback(
    async (segmentIndex: number, lyricId: string, nextMeaning: string) => {
      const lyric = localLyrics.find((l) => l.id === lyricId);
      if (!lyric?.wordSegmentation?.segments) return;

      const currentLocale = locale as SupportedLocale;
      const localeKey = currentLocale === 'zh-TW' ? 'zh-TW' : currentLocale;

      const updatedSegments = [...lyric.wordSegmentation.segments];
      const currentTranslations = updatedSegments[segmentIndex].translations || {
        en: '',
        zh: '',
        'zh-TW': '',
      };
      updatedSegments[segmentIndex] = {
        ...updatedSegments[segmentIndex],
        translations: {
          ...currentTranslations,
          [localeKey]: nextMeaning,
        },
      };

      const updatedWordSegmentation: WordSegmentationV2 = {
        ...lyric.wordSegmentation,
        segments: updatedSegments,
        metadata: {
          ...lyric.wordSegmentation.metadata,
          source: 'manual',
        },
      };

      setLocalLyrics((prev) =>
        prev.map((l) =>
          l.id === lyricId ? { ...l, wordSegmentation: updatedWordSegmentation } : l
        )
      );

      if (onLyricsUpdate) {
        onLyricsUpdate(
          localLyrics.map((l) =>
            l.id === lyricId ? { ...l, wordSegmentation: updatedWordSegmentation } : l
          )
        );
      }

      try {
        await updateWordSegmentationTranslation(lyricId, segmentIndex, localeKey, nextMeaning);
      } catch (error) {
        console.error('更新翻译失败', error);
      }
    },
    [localLyrics, locale, onLyricsUpdate]
  );

  useEffect(() => {
    if (currentLyricIndex < 0) return;

    const container = scrollContainerRef.current;
    const activeLyric = lyricRefs.current[currentLyricIndex];

    if (!container || !activeLyric) return;

    const targetTop =
      activeLyric.offsetTop - container.clientHeight / 2 + activeLyric.clientHeight / 2;

    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  }, [currentLyricIndex]);

  useEffect(() => {
    const checkMousePosition = (event: MouseEvent) => {
      if (activeTooltip) {
        const tooltipElement = document.querySelector('[data-ruby-tooltip="true"]');
        const targetElement = document.elementFromPoint(event.clientX, event.clientY);

        if (!targetElement) return;

        const isOverTooltip = tooltipElement?.contains(targetElement);
        let isOverWordTarget = false;
        const wordTargets = document.querySelectorAll('[data-word-tooltip-target="true"]');

        wordTargets.forEach((el) => {
          if (el.contains(targetElement)) {
            isOverWordTarget = true;
          }
        });

        if (!isOverTooltip && !isOverWordTarget) {
          setActiveTooltip(null);
        }
      }
    };

    const debounced = (() => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      return (event: MouseEvent) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => checkMousePosition(event), 30);
      };
    })();

    document.addEventListener('mousemove', debounced);
    return () => document.removeEventListener('mousemove', debounced);
  }, [activeTooltip]);

  const handleLyricClick = (lyric: LyricLine) => {
    const startTime = parseTimeFromUrl(lyric.contextUrl);
    const endTime = lyric.endTimeMs ? lyric.endTimeMs / 1000 : undefined;
    onSeekTo(startTime, endTime);
  };

  const renderSegment = (segment: Segment, index: number, lyricId: string) => {
    const hasRuby = !!segment.ruby;
    const hasTranslation = !!segment.translations;

    if (hasRuby || hasTranslation) {
      return (
        <ruby
          key={index}
          data-word-tooltip-target="true"
          onMouseEnter={(e) => showTooltip(segment, index, lyricId, e)}
          className={`cursor-pointer ${hasTranslation ? 'has-translation' : ''}`}
        >
          {segment.word}
          <rt className="opacity-70 text-xs">{segment.ruby || ''}</rt>
        </ruby>
      );
    }

    return <span key={index}>{segment.word}</span>;
  };

  const renderLyricText = (lyric: LyricLine) => {
    const lyricData = localLyrics.find((l) => l.id === lyric.id) || lyric;
    if (lyricData.wordSegmentation?.segments) {
      return lyricData.wordSegmentation.segments.map((segment, index) =>
        renderSegment(segment, index, lyricData.id)
      );
    }
    return lyricData.originalText;
  };

  return (
    <div className="fixed inset-0 z-(--z-overlay) flex flex-col bg-black/80 backdrop-blur-xl">
      {/* 歌词滚动区域 - 隐藏滚动条 */}
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div 
        ref={scrollContainerRef}
        className="flex-1 pb-24 overflow-y-auto hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex flex-col items-center mx-auto pt-8 w-full max-w-3xl">
          {/* 标题 - 随歌词一起滚动 */}
          <div className="mb-8 text-center">
            <h1 
              className="font-bold text-white text-2xl"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)' }}
            >
              {videoTitle || t('unknownSong')}
            </h1>
          </div>

          {/* 歌词内容 */}
          {lyrics.length > 0 ? (
            <div className="space-y-4 px-8 pb-8 w-full">
              {lyrics.map((lyric, index) => {
                const isCurrent = index === currentLyricIndex;
                const isPast = index < currentLyricIndex;

                return (
                  <div
                    key={lyric.id}
                    ref={(element) => {
                      lyricRefs.current[index] = element;
                    }}
                    onClick={() => handleLyricClick(lyric)}
                    className={`text-center transition-all duration-300 cursor-pointer hover:opacity-100 ${
                      isCurrent
                        ? 'scale-110 opacity-100'
                        : isPast
                          ? 'opacity-40 hover:opacity-70'
                          : 'opacity-60 hover:opacity-80'
                    }`}
                  >
                    <p
                      className={`text-2xl font-medium ${
                        isCurrent ? 'text-white' : 'text-gray-300'
                      }`}
                      style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.6)' }}
                    >
                      {renderLyricText(lyric)}
                    </p>
                    <p
                      className={`text-lg mt-1 ${
                        isCurrent ? 'text-gray-200' : 'text-gray-400'
                      }`}
                      style={{ textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}
                    >
                      {getTranslation(lyric.translation)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-xl">{t('empty')}</p>
          )}
        </div>
      </div>

      {/* 底部控制栏 */}
      <div className="right-0 bottom-16 left-0 absolute flex justify-center items-center gap-4">
        {/* 关闭歌词按钮 */}
        <button
          onClick={onClose}
          className="flex justify-center items-center bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full w-12 h-12 transition-colors"
          title={t('close')}
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* 播放/暂停按钮 */}
        <button
          onClick={onPlayPause}
          className="flex justify-center items-center bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full w-12 h-12 transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="ml-0.5 w-5 h-5 text-white" />
          )}
        </button>

        {/* 编辑按钮（仅管理员可见） */}
        {canEdit && onEditClick && (
          <button
            onClick={onEditClick}
            className="flex justify-center items-center bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full w-12 h-12 transition-colors"
            title={t('edit')}
          >
            <Edit3 className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* 单词悬浮窗 */}
      {activeTooltip && (
        <WordCardAdder
          activeTooltip={activeTooltip}
          isAddButtonActive={false}
          handleAddToDictionary={() => setActiveTooltip(null)}
          onKanaPronunciationBlur={(nextKana) =>
            handleKanaPronunciationBlur(
              activeTooltip.segmentIndex,
              activeTooltip.lyricId,
              nextKana
            )
          }
          onMeaningBlur={(nextMeaning) =>
            handleMeaningBlur(
              activeTooltip.segmentIndex,
              activeTooltip.lyricId,
              nextMeaning
            )
          }
          theme="frosted"
        />
      )}
    </div>
  );
}

export default LyricsOverlay;
