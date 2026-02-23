'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { handleDislikeOrDeleteVideo } from './server-function/dislike-video';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HeartOff } from 'lucide-react';
import { AddVideoDropdown } from '@/components/add-video-dropdown';
import { ChannelDock } from '@/components/channel-dock';
import { parseYouTubeUrl } from '@/lib/youtube';
import { addVideo, getYouTubeVideoInfo } from '@/components/add-video-dropdown/server-functions/videos';

interface VideoItem {
  videoId: string;
  videoTitle: string | null;
  thumbnailUrl: string | null;
  channelId: string | null;
  createTime: string;
}

interface CardsProps {
  videos: VideoItem[];
  isAdmin?: boolean;
}

export default function Cards({ videos: initialVideos }: CardsProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('safari');

  const [videos, setVideos] = useState<VideoItem[]>(initialVideos);
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [activeVideoIds, setActiveVideoIds] = useState<Set<string>>(new Set());
  const [dislikingVideoIds, setDislikingVideoIds] = useState<Set<string>>(new Set());
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hoveredVideoIdRef = useRef<string | null>(null);
  const videosRef = useRef<VideoItem[]>(initialVideos);
  const lastHoverAtRef = useRef<Record<string, number>>({});
  const activeTimersRef = useRef<Record<string, number>>({});

  const handleMouseEnter = (videoId: string) => {
    const now = Date.now();
    const last = lastHoverAtRef.current[videoId] || 0;
    if (now - last < 300) {
      setHoveredVideoId(videoId);
      hoveredVideoIdRef.current = videoId;
      return;
    }
    lastHoverAtRef.current[videoId] = now;

    setHoveredVideoId(videoId);
    hoveredVideoIdRef.current = videoId;
    setActiveVideoIds(prev => new Set(prev).add(videoId));

    if (activeTimersRef.current[videoId]) {
      window.clearTimeout(activeTimersRef.current[videoId]);
    }
    activeTimersRef.current[videoId] = window.setTimeout(() => {
      setActiveVideoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    }, 500);
  };

  const handleMouseLeave = () => {
    setHoveredVideoId(null);
    hoveredVideoIdRef.current = null;
  };

  const handleDislikeVideo = async (videoId: string) => {
    if (dislikingVideoIds.has(videoId)) return;

    const currentList = videosRef.current;
    const removedIndex = currentList.findIndex(v => v.videoId === videoId);
    const removedVideo = removedIndex >= 0 ? currentList[removedIndex] : null;

    setDislikingVideoIds(prev => new Set(prev).add(videoId));
    setVideos(prev => prev.filter(v => v.videoId !== videoId));

    if (hoveredVideoIdRef.current === videoId) {
      hoveredVideoIdRef.current = null;
      setHoveredVideoId(null);
    }

    try {
      const result = await handleDislikeOrDeleteVideo(videoId);
      if (!result.success && removedVideo) {
        setVideos(prev => {
          const next = [...prev];
          next.splice(Math.min(removedIndex, next.length), 0, removedVideo);
          return next;
        });
      }
    } catch {
      if (removedVideo) {
        setVideos(prev => {
          const next = [...prev];
          next.splice(Math.min(removedIndex, next.length), 0, removedVideo);
          return next;
        });
      }
    } finally {
      setDislikingVideoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    }
  };

  const handleCardClick = (video: VideoItem) => {
    if (video.channelId) {
      const searchParams = new URLSearchParams({ videoId: video.videoId });
      if (video.videoTitle) {
        searchParams.set('videoTitle', video.videoTitle);
      }
      router.push(`/${locale}/channels/${encodeURIComponent(video.channelId)}?${searchParams.toString()}`);
    }
  };

  videosRef.current = videos;

  const handleEmptyStateAddVideo = async () => {
    if (!videoUrlInput.trim() || isSubmitting) return;

    const { videoId } = parseYouTubeUrl(videoUrlInput.trim());
    if (!videoId) {
      console.error('无效的YouTube URL');
      return;
    }

    setIsSubmitting(true);

    try {
      const videoInfoResult = await getYouTubeVideoInfo(videoId);
      if (!videoInfoResult.success) {
        throw new Error(videoInfoResult.error);
      }

      const result = await addVideo(
        videoId,
        videoInfoResult.channelId,
        videoInfoResult.title,
        videoInfoResult.channelTitle,
        videoInfoResult.channelAvatarUrl
      );

      if (result.success) {
        setVideoUrlInput('');
        router.push(`/${locale}/channels/${encodeURIComponent(videoInfoResult.channelId)}/${encodeURIComponent(videoId)}`);
      } else {
        console.error(result.message || '添加失败');
      }
    } catch (error) {
      console.error('添加视频失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Escape') {
        const currentId = hoveredVideoIdRef.current;
        if (!currentId) return;
        e.preventDefault();
        handleDislikeVideo(currentId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (videos.length === 0) {
    return (
      <div className="fixed inset-0 flex justify-center items-center pb-40">
        <AddVideoDropdown />
        <div className="flex flex-col items-center gap-7 scale-110">
          <ChannelDock />
          
          <div className="flex items-center gap-3 w-80">
            <div className="flex-1 border-t border-black/10 dark:border-white/10" />
            <span className="text-muted-foreground text-sm whitespace-nowrap">或粘贴链接</span>
            <div className="flex-1 border-t border-black/10 dark:border-white/10" />
          </div>

          <Input
            placeholder={t('addVideo.videoUrlPlaceholder')}
            value={videoUrlInput}
            onChange={(e) => setVideoUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && videoUrlInput.trim()) {
                handleEmptyStateAddVideo();
              }
            }}
            disabled={isSubmitting}
            className="w-80 h-12"
          />
        </div>
      </div>
    );
  }

  const CARD_WIDTH = 420;
  const CARD_HEIGHT = Math.round(CARD_WIDTH * 9 / 16);

  return (
    <div className="fixed inset-0 flex justify-center items-center pb-32">
      <AddVideoDropdown />

      {videos.slice(0, 5).map((video, index) => {
        const i = index - 2;
        const isHovered = hoveredVideoId === video.videoId;
        const isActive = activeVideoIds.has(video.videoId) || isHovered;

        return (
          <div
            key={video.videoId}
            className="absolute transition-all duration-500 cursor-pointer select-none"
            style={{
              width: CARD_WIDTH,
              transform: hoveredVideoId
                ? isActive
                  ? `rotate(${i * 5}deg) translate(${i * 180}px, -120px)`
                  : `rotate(${i * 5}deg) translate(${i * 180}px, -30px)`
                : `rotate(${i * 5}deg) translate(${i * 25}px, 0)`
            }}
            onMouseEnter={() => handleMouseEnter(video.videoId)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleCardClick(video)}
          >
            <div 
              className={`absolute -top-10 left-0 right-0 flex justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            >
              <div className="font-medium text-black dark:text-white whitespace-nowrap">
                {video.videoTitle?.split(' ')[0] || '未知标题'}
              </div>
            </div>

            <div
              className="rounded-xl overflow-hidden shadow-lg"
              style={{ height: CARD_HEIGHT }}
            >

              <Button
                size="sm"
                variant="outline"
                className="top-3 left-3 z-20 absolute bg-white/90 hover:bg-white opacity-80 hover:opacity-100 p-0 w-9 h-9 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDislikeVideo(video.videoId);
                }}
                title="不喜欢这个视频"
              >
                <HeartOff className="w-4 h-4" />
              </Button>

              <img
                src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`}
                alt={video.videoTitle || '视频封面'}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
