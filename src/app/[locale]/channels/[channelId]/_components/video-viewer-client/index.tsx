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

// Hooks
import { useKeyboardControl } from './_hooks/use-keyboard-control';

// Store
import {
  store,
  type ChannelDetail,
  type MemoCardWithChannel,
  type VideoInfo,
  videoViewerStateAtom,
  channelDetailAtom,
  memoCardListAtom,
  eligibleForQuestionEntryAtom,
  createInitialVideoViewerState,
  showLimitRateAtom,
  closeLimitRateAtom,
  initializeVideoViewerAtom,
} from '../../_store';

// ============================================
// Props 类型定义
// ============================================

interface VideoViewerClientProps {
  channelDetail: ChannelDetail;
  memoCardList: MemoCardWithChannel[];
  initialVideoId: string;
  initialVideoTitle?: string | null;
  videosList: VideoInfo[];
  eligibleForQuestionEntry?: boolean;
}

// ============================================
// 内部组件
// ============================================

function VideoViewerClientInner({
  channelDetail,
  memoCardList,
  initialVideoId,
  initialVideoTitle,
  videosList,
  eligibleForQuestionEntry = false,
}: VideoViewerClientProps) {
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

  // 初始化视频查看器状态（通过 key 触发重新挂载来处理软导航）
  useEffect(() => {
    initializeVideoViewer({
      videoId: initialVideoId,
      videoTitle: initialVideoTitle ?? null,
      videos: videosList,
    });
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
