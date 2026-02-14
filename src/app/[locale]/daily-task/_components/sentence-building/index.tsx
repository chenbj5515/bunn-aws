'use client';

import React, { useReducer, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { speakTextWithMinimax } from '@/lib/tts';
import type { WordSegment } from '@/types/extended-memo-card';
import type { ExtendedMemoCard } from '../daily-task-client';
import {
  sentenceBuildingReducer,
  initialState,
  type SentenceBuildingState,
  type SentenceBuildingAction,
} from './reducer';
import { shuffleArray, checkCorrectOrder } from './utils';
import { MessageBubble } from './message-bubble';
import { SelectedArea } from './selected-area';
import { AvailableArea } from './available-area';
import { ActionPanel } from './action-panel';

// ============================================
// 辅助函数：转换数据格式
// ============================================

/**
 * 将数据库中的原始分词格式转换为组件内部使用的标准格式
 */
function convertToWordSegments(memoCard: ExtendedMemoCard): WordSegment[] {
  const wordSegmentation = memoCard.wordSegmentation;
  if (!wordSegmentation) return [];

  // 处理新格式：{ words: [...], source, segmentedAt }
  if ('words' in wordSegmentation && Array.isArray(wordSegmentation.words)) {
    return wordSegmentation.words.map((raw, index) => ({
      id: `segment-${index}`,
      text: raw.word,
      type: (raw.wordType === 'other' ? 'word' : raw.wordType) as WordSegment['type'],
    }));
  }

  // 处理旧格式：{ segments: [...] }（兼容性）
  if ('segments' in wordSegmentation && Array.isArray(wordSegmentation.segments)) {
    return wordSegmentation.segments;
  }

  return [];
}

// ============================================
// 核心流程函数
// ============================================

/**
 * 1. 初始化片段 - 从 memoCard.wordSegmentation 获取分词并打乱顺序
 */
function initializeSegments(
  dispatch: React.Dispatch<SentenceBuildingAction>,
  memoCard: ExtendedMemoCard
): void {
  // 将原始数据转换为标准格式
  const wordSegments = convertToWordSegments(memoCard);

  if (wordSegments.length === 0) return;

  const shuffled = shuffleArray(wordSegments);
  dispatch({ type: 'INITIALIZE', payload: { segments: shuffled } });
}

/**
 * 2. 选择片段 - 从备选区移到选中区
 */
function selectSegment(
  dispatch: React.Dispatch<SentenceBuildingAction>,
  segmentId: string
): void {
  dispatch({ type: 'SELECT_SEGMENT', payload: { segmentId } });
}

/**
 * 3. 取消选择 - 从选中区移回备选区
 */
function deselectSegment(
  dispatch: React.Dispatch<SentenceBuildingAction>,
  segmentId: string
): void {
  dispatch({ type: 'DESELECT_SEGMENT', payload: { segmentId } });
}

/**
 * 4. 提交答案 - 判题并更新统计
 */
function submitAnswer(
  dispatch: React.Dispatch<SentenceBuildingAction>,
  state: SentenceBuildingState,
  originalText: string
): void {
  const isCorrect = checkCorrectOrder(
    state.selectedSegmentIds,
    state.shuffledSegments,
    originalText
  );
  dispatch({ type: 'SUBMIT', payload: { isCorrect } });
}

/**
 * 5. 继续 - 完成答题，回调父组件
 */
function continueToNext(
  state: SentenceBuildingState,
  onComplete: (isCorrect: boolean) => void
): void {
  onComplete(state.isCorrect ?? false);
}


// ============================================
// 组件
// ============================================

interface SentenceBuildingProps {
  /** 当前记忆卡片数据 */
  memoCard: ExtendedMemoCard;
  /** 完成拼句子后的回调，参数为是否正确 */
  onComplete: (isCorrect: boolean) => void;
}

export function SentenceBuilding({ memoCard, onComplete }: SentenceBuildingProps) {
  const t = useTranslations('sentenceBuilding');
  const tContext = useTranslations('contextViewer');
  const locale = useLocale();

  const [state, dispatch] = useReducer(sentenceBuildingReducer, initialState);
  const { shuffledSegments, selectedSegmentIds, isPlaying, showResult, isCorrect } = state;

  // 1. 初始化
  useEffect(() => {
    initializeSegments(dispatch, memoCard);
  }, []);

  // 2. 点击备选区片段
  const handleAvailableClick = (segmentId: string) => {
    selectSegment(dispatch, segmentId);
    // 后台播放单词 TTS
    const segment = shuffledSegments.find((s) => s.id === segmentId);
    if (segment) {
      speakTextWithMinimax(segment.text, 'ja').catch((error) => {
        console.error('单词TTS播放失败:', error);
      });
    }
  };

  // 3. 点击选中区片段
  const handleSelectedClick = (segmentId: string) => {
    if (!showResult) {
      deselectSegment(dispatch, segmentId);
    }
  };

  // 4. 播放整句 TTS
  const handlePlayTTS = async () => {
    if (isPlaying || !memoCard.originalText) return;

    dispatch({ type: 'SET_PLAYING', payload: { isPlaying: true } });
    try {
      await speakTextWithMinimax(memoCard.originalText);
    } catch (error) {
      console.error('TTS播放失败:', error);
    } finally {
      dispatch({ type: 'SET_PLAYING', payload: { isPlaying: false } });
    }
  };

  // 5. 提交答案
  const handleSubmit = () => {
    submitAnswer(dispatch, state, memoCard.originalText || '');
  };

  // 6. 继续
  const handleContinue = () => {
    continueToNext(state, onComplete);
  };

  // 获取翻译文本
  const getTranslation = (): string => {
    if (!memoCard.translation) return '';
    if (typeof memoCard.translation === 'string') return memoCard.translation;
    // 根据当前 locale 获取翻译
    const translation = memoCard.translation as Record<string, string>;
    return translation[locale] || translation.zh || translation.en || '';
  };

  // 检查是否有分词数据（支持新旧两种格式）
  const hasWordSegmentation = (() => {
    const ws = memoCard.wordSegmentation;
    if (!ws) return false;
    // 新格式：{ words: [...] }
    if ('words' in ws && Array.isArray(ws.words) && ws.words.length > 0) return true;
    // 旧格式：{ segments: [...] }
    if ('segments' in ws && Array.isArray(ws.segments) && ws.segments.length > 0) return true;
    return false;
  })();
  
  // 加载状态：useEffect 还没执行完
  const isLoading = hasWordSegmentation && shuffledSegments.length === 0;
  
  // 没有分词数据：显示错误提示
  if (!hasWordSegmentation) {
    return (
      <div className="flex flex-col justify-center items-center bg-[#f4f4f4] mx-auto p-8 rounded-2xl w-[435px] min-h-[300px]">
        <p className="text-gray-500 text-lg">{t('noSegmentationData')}</p>
      </div>
    );
  }
  
  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center bg-[#f4f4f4] mx-auto p-8 rounded-2xl w-[435px] min-h-[300px]">
        <div className="border-4 border-gray-300 border-t-blue-500 rounded-full w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#f4f4f4] mx-auto p-4 rounded-2xl max-w-3xl min-h-[600px]">
      {/* 头像气泡区 - 展示翻译 */}
      <MessageBubble
        avatarUrl={memoCard.avatarUrl || ""}
        avatarAlt={tContext('defaultCharacterName')}
        translation={getTranslation()}
        isPlaying={isPlaying}
        onPlayTTS={handlePlayTTS}
      />

      {/* 主要内容区域 */}
      <div className="flex flex-col flex-1 gap-4 mt-6">
        {/* 提示文本 */}
        <p className="font-medium text-xl text-center">{t('characterSaid', { character: 'TA' })}</p>

        {/* 选中区 */}
        <SelectedArea
          selectedSegmentIds={selectedSegmentIds}
          availableSegments={shuffledSegments}
          showResult={showResult}
          onTokenClick={handleSelectedClick}
        />

        {/* 间隔线 */}
        <hr className="border-[#e5e7eb] border-0 border-t" />

        {/* 备选区 */}
        <AvailableArea
          availableSegments={shuffledSegments}
          selectedSegmentIds={selectedSegmentIds}
          onTokenClick={handleAvailableClick}
        />

        {/* 动作区 */}
        <ActionPanel
          selectedCount={selectedSegmentIds.length}
          totalCount={shuffledSegments.length}
          isSubmitted={showResult}
          isCorrect={isCorrect}
          originalText={memoCard.originalText || ''}
          onSubmit={handleSubmit}
          onContinue={handleContinue}
        />
      </div>
    </div>
  );
}
