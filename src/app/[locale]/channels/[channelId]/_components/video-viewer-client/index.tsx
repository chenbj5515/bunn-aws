'use client';

import { useEffect } from 'react';
import { Provider, useSetAtom, useAtomValue } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { AddVideoDropdown } from '@/components/add-video-dropdown';
import LimitRate from '@/components/ui/limit-rate';

// 组件
import { VideoTitleBar } from '../video-title-bar';
import TvPlayerSection from '../tv-player-section';
import { MemoCardModal } from '../memo-card-modal';
import CaptureDialog from '../capture-dialog';
import { useChannelContext } from '../channel-provider';

// Hooks
import { useKeyboardControl } from './_hooks/use-keyboard-control';

// Store
import {
  store,
  type MemoCardWithChannel,
  videoViewerStateAtom,
  channelDetailAtom,
  memoCardListAtom,
  eligibleForQuestionEntryAtom,
  createInitialVideoViewerState,
  showLimitRateAtom,
  closeLimitRateAtom,
  initializeVideoViewerAtom,
  setMemoCardListAtom,
} from '../../_store';

// ============================================
// Props 类型定义
// ============================================

interface VideoViewerClientProps {
  /** 当前视频的记忆卡片列表（从 page.tsx 传入） */
  memoCardList: MemoCardWithChannel[];
  /** 当前视频 ID */
  initialVideoId: string;
  /** 当前视频标题 */
  initialVideoTitle?: string | null;
}

// ============================================
// 内部组件
// ============================================

function VideoViewerClientInner({
  memoCardList,
  initialVideoId,
  initialVideoTitle,
}: VideoViewerClientProps) {
  // 从 ChannelProvider 获取共享数据（由 layout.tsx 提供）
  const { channelDetail, videosList, eligibleForQuestionEntry } = useChannelContext();

  // 初始化 store
  useHydrateAtoms(
    [
      [videoViewerStateAtom, createInitialVideoViewerState(initialVideoId, initialVideoTitle ?? null, videosList)],
      [channelDetailAtom, channelDetail],
      [memoCardListAtom, memoCardList],
      [eligibleForQuestionEntryAtom, eligibleForQuestionEntry],
    ],
    { store }
  );

  // 读取状态
  const showLimitRate = useAtomValue(showLimitRateAtom);

  // 写入状态
  const closeLimitRate = useSetAtom(closeLimitRateAtom);
  const initializeVideoViewer = useSetAtom(initializeVideoViewerAtom);
  const setMemoCardList = useSetAtom(setMemoCardListAtom);

  useEffect(() => {
    initializeVideoViewer({
      videoId: initialVideoId,
      videoTitle: initialVideoTitle ?? null,
      videos: videosList,
    });
    // 更新记忆卡片列表（切换视频时需要同步更新）
    setMemoCardList(memoCardList);
  }, []);

  // 键盘控制
  useKeyboardControl();

  return (
    <div className="fixed inset-0">
      <VideoTitleBar />
      <AddVideoDropdown />
      <TvPlayerSection />
      <MemoCardModal />
      <CaptureDialog />
      <LimitRate show={showLimitRate} onClose={closeLimitRate} />
    </div>
  );
}

// ============================================
// 导出组件
// ============================================

export function VideoViewerClient(props: VideoViewerClientProps) {
  return (
    <Provider store={store}>
      <VideoViewerClientInner key={props.initialVideoId} {...props} />
    </Provider>
  );
}

export default VideoViewerClient;
