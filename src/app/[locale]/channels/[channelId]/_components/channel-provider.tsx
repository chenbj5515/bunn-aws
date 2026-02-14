'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ChannelDetail, VideoInfo } from '../_store/types';

// ============================================
// Context 类型定义
// ============================================

interface ChannelContextValue {
  channelDetail: ChannelDetail;
  videosList: VideoInfo[];
  eligibleForQuestionEntry: boolean;
}

// ============================================
// Context 创建
// ============================================

const ChannelContext = createContext<ChannelContextValue | null>(null);

// ============================================
// Provider 组件
// ============================================

interface ChannelProviderProps {
  children: ReactNode;
  channelDetail: ChannelDetail;
  videosList: VideoInfo[];
  eligibleForQuestionEntry: boolean;
}

export function ChannelProvider({
  children,
  channelDetail,
  videosList,
  eligibleForQuestionEntry,
}: ChannelProviderProps) {
  return (
    <ChannelContext.Provider
      value={{
        channelDetail,
        videosList,
        eligibleForQuestionEntry,
      }}
    >
      {children}
    </ChannelContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useChannelContext() {
  const context = useContext(ChannelContext);
  if (!context) {
    throw new Error('useChannelContext must be used within a ChannelProvider');
  }
  return context;
}
