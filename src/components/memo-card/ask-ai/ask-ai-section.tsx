"use client";

import { useEffect, useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  getAskAIStateAtom,
  initializeAskAIAtom,
  openAskAIDialogAtom,
  isAskAIDialogOpenAtom,
} from '@/app/[locale]/channels/[channelId]/_store';
import { AskAIStage } from '@/app/[locale]/channels/[channelId]/_store/types';
import type { AskAIMessage } from '@/app/[locale]/channels/[channelId]/_store/types';
import { AskAIInput } from './ask-ai-input';
import { AskAIChatPreview } from './ask-ai-chat-preview';
import { AskAIDialog } from './ask-ai-dialog';

interface MemoCardData {
  id: string;
  originalText: string | null;
  translation: Record<string, string> | string;
  contextInfo?: Array<{ zh: string; en: string; 'zh-TW': string }>;
  messages?: AskAIMessage[];
}

interface AskAISectionProps {
  memoCard: MemoCardData;
}

/**
 * 问 AI 主容器组件
 * 根据状态显示输入框或预览框
 */
export function AskAISection({ memoCard }: AskAISectionProps) {
  // Jotai atoms
  const getAskAIState = useAtomValue(getAskAIStateAtom);
  const initializeAskAI = useSetAtom(initializeAskAIAtom);
  const openDialog = useSetAtom(openAskAIDialogAtom);
  const isDialogOpen = useAtomValue(isAskAIDialogOpenAtom);

  const askAIState = getAskAIState(memoCard.id);

  // 预处理预加载的消息（从 RSC 传入）
  const preloadedMessages = useMemo(() => {
    if (!memoCard.messages || memoCard.messages.length === 0) return undefined;
    return memoCard.messages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      isInitialAnalysis: msg.isInitialAnalysis,
      isHistory: true,
    }));
  }, [memoCard.messages]);

  // 初始化：同步 Jotai 状态
  useEffect(() => {
    initializeAskAI({
      cardId: memoCard.id,
      messages: preloadedMessages,
    });
  }, [memoCard.id, preloadedMessages, initializeAskAI]);

  // 处理发送消息（从输入框）
  const handleSendMessage = (message: string) => {
    openDialog({
      cardId: memoCard.id,
      action: 'question',
      question: message,
    });
  };

  // 处理语法分析
  const handleGrammarAnalysis = () => {
    openDialog({
      cardId: memoCard.id,
      action: 'grammar',
    });
  };

  // 处理预览框点击
  const handlePreviewClick = () => {
    openDialog({
      cardId: memoCard.id,
    });
  };

  // 根据状态渲染不同的内容
  const renderContent = () => {
    const { stage, messages: storeMessages } = askAIState;

    // 优先使用预加载的消息（首次渲染时 Jotai 状态可能还没更新）
    const hasPreloadedMessages = preloadedMessages && preloadedMessages.length > 0;
    const displayMessages = storeMessages.length > 0 ? storeMessages : (preloadedMessages || []);

    // 有消息时显示预览框
    if (hasPreloadedMessages || stage === AskAIStage.HasHistory || (stage === AskAIStage.DialogOpen && storeMessages.length > 0)) {
      return (
        <AskAIChatPreview
          messages={displayMessages}
          onClick={handlePreviewClick}
        />
      );
    }

    // 无历史消息时显示输入框
    return (
      <AskAIInput
        onSendMessage={handleSendMessage}
        onGrammarAnalysis={handleGrammarAnalysis}
      />
    );
  };

  return (
    <div className="relative mb-[16px]">
      {renderContent()}

      {/* 弹窗 */}
      {isDialogOpen && (
        <AskAIDialog memoCard={memoCard} />
      )}
    </div>
  );
}
