'use client';

import { useLayoutEffect } from 'react';
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
  videoPlayerRefAtom,
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

  // 组件挂载时同步重置 store 状态
  // 由于外层使用 key={initialVideoId}，切换视频时组件会重新挂载，所以只需在挂载时执行
  useLayoutEffect(() => {
    // 清理旧的播放器引用
    store.set(videoPlayerRefAtom, null);
    // 重置视频查看器状态
    store.set(videoViewerStateAtom, createInitialVideoViewerState(initialVideoId, initialVideoTitle ?? null, videosList));
    // 更新频道相关数据
    store.set(channelDetailAtom, channelDetail);
    store.set(memoCardListAtom, memoCardList);
    store.set(eligibleForQuestionEntryAtom, eligibleForQuestionEntry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 初始化 store（用于首次加载时的 SSR hydration）
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
