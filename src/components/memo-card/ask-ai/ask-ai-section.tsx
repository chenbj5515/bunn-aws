"use client";

import { useEffect } from 'react';
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

  // 初始化：检查是否有历史消息
  useEffect(() => {
    // 转换预加载的消息格式
    const preloadedMessages = memoCard.messages?.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      isInitialAnalysis: msg.isInitialAnalysis,
      isHistory: true,
    }));

    initializeAskAI({
      cardId: memoCard.id,
      messages: preloadedMessages,
    });
  }, [memoCard.id, memoCard.messages, initializeAskAI]);

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
    const { stage, messages, isLoadingHistory } = askAIState;

    // 正在加载历史消息时显示加载状态
    if (isLoadingHistory) {
      return (
        <div className="flex justify-center items-center bg-gray-50 p-4 border border-gray-200 rounded-xl h-[140px]">
          <div className="text-gray-400 text-sm animate-pulse">加载中...</div>
        </div>
      );
    }

    // 有历史消息时显示预览框
    if (stage === AskAIStage.HasHistory || (stage === AskAIStage.DialogOpen && messages.length > 0)) {
      return (
        <AskAIChatPreview
          messages={messages}
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
