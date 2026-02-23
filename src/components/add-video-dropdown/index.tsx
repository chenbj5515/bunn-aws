"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChannelDock } from '../channel-dock';
import { addVideo, getYouTubeVideoInfo } from './server-functions/videos';
import { parseYouTubeUrl } from '@/lib/youtube';

interface AddVideoDropdownProps {
  // safari模式：跳转到新频道，显示ChannelDock
  safariMode?: boolean;
  // channels模式：在当前频道添加视频
  channelId?: string;
  // 禁用空格键激活触发器（避免与全局播放/暂停冲突）
  disableSpaceActivation?: boolean;
}

export function AddVideoDropdown({
  safariMode = true,
  channelId,
  disableSpaceActivation = true
}: AddVideoDropdownProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = safariMode ? useTranslations('safari') : null;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddVideo = async () => {
    if (!videoUrlInput.trim()) {
      console.error('请填写视频URL');
      return;
    }

    // 验证URL是否为有效的YouTube URL
    const { videoId } = parseYouTubeUrl(videoUrlInput.trim());
    if (!videoId) {
      console.error('无效的YouTube URL');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 调用 server function 获取 YouTube 视频信息
      const videoInfoResult = await getYouTubeVideoInfo(videoId);
      if (!videoInfoResult.success) {
        throw new Error(videoInfoResult.error);
      }
      const videoInfo = videoInfoResult;

      // 2. 添加视频到数据库
      // safari模式：使用API返回的channelId（handle或内部ID）
      // channels模式：使用传入的channelId
      const targetChannelId = safariMode ? videoInfo.channelId : (channelId || videoInfo.channelId);
      const result = await addVideo(
        videoId,
        targetChannelId,
        videoInfo.title,
        videoInfo.channelTitle,
        videoInfo.channelAvatarUrl
      );

      if (result.success) {
        setIsDropdownOpen(false);
        setVideoUrlInput('');

        if (safariMode) {
          // safari模式：跳转到 channel/video 详情页
          router.push(`/${locale}/channels/${encodeURIComponent(videoInfo.channelId)}/${encodeURIComponent(videoId)}`);
        } else {
          // channels模式：跳转到当前频道的视频（使用嵌套路由）
          const currentChannelId = channelId || params.channelId as string;
          router.push(`/${locale}/channels/${encodeURIComponent(currentChannelId)}/${encodeURIComponent(videoId)}`);
        }
      } else {
        console.error(result.message || '添加失败');
      }
    } catch (error) {
      console.error('添加视频失败:', error);
      console.error('添加失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="top-4 right-4 z-50 fixed">
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="shadow-lg rounded-full w-12 h-12"
            onKeyDown={(e) => {
              if (disableSpaceActivation && (e.code === 'Space' || e.key === ' ')) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onKeyUp={(e) => {
              if (disableSpaceActivation && (e.code === 'Space' || e.key === ' ')) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="p-4 w-80" align="end">
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-medium text-[18px]">
                {safariMode && t ? t('addVideo.videoUrl') : '视频URL'}
              </label>
              {safariMode && <ChannelDock className="mb-3" />}
              <Input
                placeholder={safariMode && t ? t('addVideo.videoUrlPlaceholder') : "输入YouTube视频URL..."}
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && videoUrlInput.trim()) {
                    handleAddVideo();
                  }
                }}
              />
            </div>

            <Button
              onClick={handleAddVideo}
              disabled={!videoUrlInput.trim() || isSubmitting}
              className="bg-black hover:shadow-lg w-full text-white transition-all duration-200"
            >
              {isSubmitting ? (
                <div className="border-white border-b-2 rounded-full w-4 h-4 animate-spin"></div>
              ) : (
                safariMode && t ? t('addVideo.submit') : '添加视频'
              )}
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
