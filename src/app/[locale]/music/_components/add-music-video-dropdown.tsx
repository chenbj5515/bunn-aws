'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { parseYouTubeUrl } from '@/lib/youtube';
import { getYouTubeVideoInfo } from '@/components/add-video-dropdown/server-functions/videos';
import { addMusicVideo } from './server-functions';

interface AddMusicVideoDropdownProps {
  onVideoAdded?: () => void;
  /** 内联模式：不使用 fixed/absolute 定位，直接渲染按钮 */
  inline?: boolean;
}

export function AddMusicVideoDropdown({ onVideoAdded, inline = false }: AddMusicVideoDropdownProps) {
  const t = useTranslations('music.addVideo');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [isOpen, setIsOpen] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getVideoInfoErrorMessage = (message: string) => {
    const errorMap: Record<string, string> = {
      '获取视频信息失败': t('errors.fetchVideoInfoFailed'),
      '视频不存在': t('errors.videoNotFound'),
      '视频数据无效': t('errors.invalidVideoData'),
      '未知错误': t('errors.fetchVideoInfoFailed'),
      'API key not configured': t('errors.fetchVideoInfoFailed'),
    };

    return errorMap[message] || message;
  };

  const handleAddVideo = async () => {
    if (!videoUrlInput.trim()) {
      setError(t('errors.videoUrlRequired'));
      return;
    }

    const { videoId } = parseYouTubeUrl(videoUrlInput.trim());
    if (!videoId) {
      setError(t('errors.invalidYoutubeUrl'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const videoInfoResult = await getYouTubeVideoInfo(videoId);
      if (!videoInfoResult.success) {
        throw new Error(getVideoInfoErrorMessage(videoInfoResult.error));
      }

      const result = await addMusicVideo(videoId, videoInfoResult.title);

      if (result.success) {
        setIsOpen(false);
        setVideoUrlInput('');
        onVideoAdded?.();
        router.push(`/${locale}/music/${encodeURIComponent(videoId)}`);
        router.refresh();
      } else {
        setError(
          result.messageKey ? t(`errors.${result.messageKey}`) : t('errors.addFailed')
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.addFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-center items-center bg-black/80 hover:bg-black shadow-lg backdrop-blur-sm rounded-full w-12 h-12 transition-colors"
        title={t('triggerTitle')}
      >
        <Plus className="w-5 h-5 text-white" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-(--z-drawer)"
            onClick={() => setIsOpen(false)}
          />
          <div className="right-0 z-(--z-popover) absolute bg-white shadow-xl mt-2 p-4 rounded-xl w-80">
            <h3 className="mb-3 font-medium text-gray-900 text-lg">{t('dialogTitle')}</h3>

            {error && (
              <div className="bg-red-50 mb-3 p-2 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <input
              type="text"
              placeholder={t('inputPlaceholder')}
              value={videoUrlInput}
              onChange={(e) => setVideoUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && videoUrlInput.trim()) {
                  handleAddVideo();
                }
              }}
              className="mb-3 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/20 w-full text-gray-900 focus:outline-none"
            />

            <button
              onClick={handleAddVideo}
              disabled={!videoUrlInput.trim() || isSubmitting}
              className="flex justify-center items-center bg-black hover:bg-gray-800 disabled:opacity-50 py-2 rounded-lg w-full font-medium text-white transition-colors disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('submit')
              )}
            </button>
          </div>
        </>
      )}
    </>
  );

  if (inline) {
    return <div className="relative">{content}</div>;
  }

  return (
    <div className="top-4 right-4 z-(--z-header) absolute">
      {content}
    </div>
  );
}

export default AddMusicVideoDropdown;
