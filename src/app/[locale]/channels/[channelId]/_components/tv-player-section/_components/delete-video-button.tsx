'use client';

import { FC } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, useSearchParams, useParams } from 'next/navigation';
import { DeleteButton } from '@/components/ui/delete-button';
import {
  isDeletingChannelAtom,
  channelDetailAtom,
  currentVideoIdAtom,
  videosAtom,
  setDeleteStateAtom,
  setCurrentVideoAtom,
} from '../../../_store';
import { deleteChannel } from '../../../server-functions/delete-channel';
import { BUTTON_SIZE } from '../../../_utils/constants';

/**
 * 删除视频按钮组件
 */
export const DeleteVideoButton: FC = () => {
  const t = useTranslations('channels');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = useParams() as { locale: string };

  // 读取状态
  const isDeletingChannel = useAtomValue(isDeletingChannelAtom);
  const channelDetail = useAtomValue(channelDetailAtom);
  const currentVideoId = useAtomValue(currentVideoIdAtom);
  const videos = useAtomValue(videosAtom);

  // 写入状态
  const setDeleteState = useSetAtom(setDeleteStateAtom);
  const setCurrentVideo = useSetAtom(setCurrentVideoAtom);

  // 处理删除
  const handleDelete = async () => {
    if (!channelDetail) return;

    setDeleteState(true);

    try {
      const result = await deleteChannel(channelDetail.channelId, currentVideoId);
      
      if (!result.success) {
        console.error('删除频道失败:', result.message);
        return;
      }

      if (result.channelDeleted) {
        router.push(`/${locale}/channels`);
        return;
      }

      if (result.nextVideoId) {
        const next = videos.find(v => v.videoId === result.nextVideoId);
        setCurrentVideo({ videoId: result.nextVideoId, videoTitle: next?.videoTitle || 'Unknown Video' });
        const sp = new URLSearchParams(searchParams);
        sp.set('videoId', result.nextVideoId);
        router.replace(`${pathname}?${sp.toString()}`);
        return;
      }

      // 安全兜底
      const fallback = videos.find(v => v.videoId !== currentVideoId) || videos[0];
      if (fallback) {
        setCurrentVideo({ videoId: fallback.videoId, videoTitle: fallback.videoTitle });
        const sp = new URLSearchParams(searchParams);
        sp.set('videoId', fallback.videoId);
        router.replace(`${pathname}?${sp.toString()}`);
      } else {
        router.push(`/${locale}/channels`);
      }
    } catch (error) {
      console.error('删除频道失败:', error);
    } finally {
      setDeleteState(false);
    }
  };

  return (
    <DeleteButton
      onClick={handleDelete}
      label={t('deleteVideo')}
      loading={isDeletingChannel}
      size={BUTTON_SIZE.ROUND}
      className="top-[2px] right-[-66px] z-30 absolute"
      tooltipSide="right"
    />
  );
};
