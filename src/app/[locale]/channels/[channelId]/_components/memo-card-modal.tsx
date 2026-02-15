'use client';

import { FC } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { MemoCard as MemoCard } from '@/components/memo-card';
import { DeleteButton } from '@/components/ui/delete-button';
import {
  showMemoCardAtom,
  selectedMemoCardAtom,
  channelDetailAtom,
  eligibleForQuestionEntryAtom,
  hideMemoCardModalAtom,
  videoPlayerRefAtom,
  updateMemoCardTranslationAtom,
  updateMemoCardContextInfoAtom,
} from '../_store';
import { deleteMemoCard } from '@/components/memo-card/server-functions/delete-memo-card';
import { parseVideoStartTime } from '../_utils/video-utils';

/**
 * 记忆卡片弹窗组件
 */
export const MemoCardModal: FC = () => {
  const t = useTranslations('channels');
  
  // 读取状态
  const showMemoCard = useAtomValue(showMemoCardAtom);
  const selectedMemoCard = useAtomValue(selectedMemoCardAtom);
  const channelDetail = useAtomValue(channelDetailAtom);
  const eligibleForQuestionEntry = useAtomValue(eligibleForQuestionEntryAtom);
  const videoPlayer = useAtomValue(videoPlayerRefAtom);

  console.log('selectedMemoCard', selectedMemoCard?.messages);

  // 写入状态
  const hideMemoCardModal = useSetAtom(hideMemoCardModalAtom);
  const updateMemoCardTranslation = useSetAtom(updateMemoCardTranslationAtom);
  const updateMemoCardContextInfo = useSetAtom(updateMemoCardContextInfoAtom);

  // 处理翻译更新
  const handleTranslationUpdate = (translation: Record<string, string>) => {
    if (selectedMemoCard) {
      updateMemoCardTranslation({ id: selectedMemoCard.id, translation });
    }
  };

  // 处理笔记/上下文更新
  const handleContextInfoUpdate = (contextInfo: Array<{ zh: string; en: string; 'zh-TW': string }>) => {
    if (selectedMemoCard) {
      updateMemoCardContextInfo({ id: selectedMemoCard.id, contextInfo });
    }
  };

  // 关闭弹窗
  const handleClose = () => {
    hideMemoCardModal();
    history.replaceState(null, '', location.pathname);
  };

  // 删除卡片
  const handleDelete = async () => {
    if (!selectedMemoCard) return;
    try {
      hideMemoCardModal();
      await deleteMemoCard(selectedMemoCard.id);
      window.location.reload();
    } catch (error) {
      console.error('删除记忆卡片失败:', error);
    }
  };

  // 从标记点播放视频
  const handlePlayVideo = () => {
    if (selectedMemoCard?.contextUrl && videoPlayer) {
      const startTime = parseVideoStartTime(selectedMemoCard.contextUrl);
      videoPlayer.seekTo(startTime, true);
      videoPlayer.playVideo();
    }
    hideMemoCardModal();
    history.replaceState(null, '', location.pathname);
  };

  const isVisible = showMemoCard && selectedMemoCard;

  return (
    <div
      className={`top-0 left-0 z-5000 fixed ${isVisible ? 'flex' : 'hidden'} justify-center items-center bg-black/50 backdrop-blur-md w-full h-full`}
      onClick={handleClose}
    >
      {selectedMemoCard && (
        <div
          className="relative min-w-[800px] max-w-2xl max-h-[80vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <DeleteButton
            onClick={handleDelete}
            label={t('deleteMemoCard')}
            className="top-[6px] right-0 z-20 absolute"
            tooltipSide="left"
          />
          <MemoCard
            key={selectedMemoCard.id}
            {...selectedMemoCard}
            setDisplayCards={() => {}}
            weakBorder={true}
            characterAvatarUrl={selectedMemoCard.avatarUrl}
            channelAvatarUrl={channelDetail?.avatarUrl}
            onPlayVideo={handlePlayVideo}
            shouldShowQuestionEntry={eligibleForQuestionEntry}
            onTranslationUpdate={handleTranslationUpdate}
            onContextInfoUpdate={handleContextInfoUpdate}
          />
        </div>
      )}
    </div>
  );
};
