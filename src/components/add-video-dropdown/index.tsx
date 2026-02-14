"use client";

import { useState } from 'react';
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
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
  // safari模式：跳转到新频道，显示ChannelDock和封面预览
  safariMode?: boolean;
  // channels模式：在当前频道添加视频
  channelId?: string;
  // 管理员权限
  isCoverAdmin?: boolean;
  // 禁用空格键激活触发器（避免与全局播放/暂停冲突）
  disableSpaceActivation?: boolean;
}

export function AddVideoDropdown({
  safariMode = true,
  channelId,
  isCoverAdmin = false,
  disableSpaceActivation = true
}: AddVideoDropdownProps) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const t = safariMode ? useTranslations('safari') : null;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

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
        // 3. 如果是封面管理员且选择了封面，从剪贴板上传封面并设置缩略图
        if (isCoverAdmin && coverFile) {
          try {
            const formData = new FormData();
            formData.append('file', coverFile);
            formData.append('videoId', videoId);
            await fetch('/api/videos/thumbnail', { method: 'POST', body: formData });
          } catch (e) {
            console.error('封面上传失败', e);
          }
        }

        // 4. 跳转逻辑
        setIsDropdownOpen(false);
        setVideoUrlInput('');
        if (isCoverAdmin) {
          if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
          setCoverPreviewUrl(null);
          setCoverFile(null);
        }

        if (safariMode) {
          // safari模式：跳转到channel详情页
          router.push(`/${locale}/channels/${encodeURIComponent(videoInfo.channelId)}?videoId=${encodeURIComponent(videoId)}`);
        } else {
          // channels模式：跳转到当前频道的视频
          const params = new URLSearchParams(searchParams);
          params.set('videoId', videoId);
          router.push(`${pathname}?${params.toString()}`);
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

  const handleCancelAddVideo = () => {
    setIsDropdownOpen(false);
    setVideoUrlInput('');
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    setCoverPreviewUrl(null);
    setCoverFile(null);
  };

  const pickCoverFromClipboard = async () => {
    // 从剪贴板读取图片的逻辑（复用自cards.tsx）
    const readImageFromClipboard = async (): Promise<File | null> => {
      const clipboardObj: any = navigator.clipboard as any;
      if (!clipboardObj || typeof clipboardObj.read !== 'function') {
        console.error('当前浏览器不支持从剪贴板读取图片');
        return null;
      }
      try {
        const items = await clipboardObj.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const ext = (type.split('/')?.[1]) || 'png';
              return new File([blob], `clipboard.${ext}`, { type });
            }
          }
        }
        console.error('剪贴板中没有图片');
        return null;
      } catch (err) {
        console.error('读取剪贴板失败:', err);
        return null;
      }
    };

    const file = await readImageFromClipboard();
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    setCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
  };

  const clearCover = () => {
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    setCoverPreviewUrl(null);
    setCoverFile(null);
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

            {safariMode && isCoverAdmin && (
              <div>
                <label className="block mb-2 font-medium text-sm">
                  {t?.('addVideo.coverPreview')}
                </label>
                {coverPreviewUrl ? (
                  <div className="flex items-center gap-2">
                    <img src={coverPreviewUrl} alt="cover preview" className="rounded w-16 h-16 object-cover" />
                    <Button size="sm" variant="outline" onClick={clearCover}>
                      {t?.('addVideo.removeCover')}
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" onClick={pickCoverFromClipboard} className="w-full">
                    {t?.('addVideo.coverFromClipboard')}
                  </Button>
                )}
              </div>
            )}

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
