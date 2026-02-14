'use client';

import React, { useReducer, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
// import { updateUserAnswerStats } from '@/server-functions/update-user-answer-stats';
import { prefetchTextWithMinimax } from '@/lib/tts';
import type { ExtendedMemoCard } from '../daily-task-client';
import {
  choiceQuestionReducer,
  initialState,
  type ChoiceQuestionState,
  type ChoiceQuestionAction,
} from './reducer';
import { generateQuestions, type Word } from './utils';
import { MessageBubble } from './message-bubble';
import { QuestionOptions } from './question-options';
import { ActionPanel } from './action-panel';

// ============================================
// 四个核心流程函数
// ============================================

/**
 * 1. 生成问题 - 根据单词列表生成问题并初始化状态
 */
function initializeQuestions(
  dispatch: React.Dispatch<ChoiceQuestionAction>,
  words: Word[],
  t: (key: string, values?: Record<string, any>) => string,
  locale: string
): void {
  if (!words || words.length === 0) return;

  const generatedQuestions = generateQuestions(words, t, locale);
  dispatch({
    type: 'INITIALIZE',
    payload: { questions: generatedQuestions },
  });
}

/**
 * 2. 选择选项 - 处理用户选择答案
 */
function selectAnswer(
  dispatch: React.Dispatch<ChoiceQuestionAction>,
  answer: string
): void {
  dispatch({ type: 'SELECT_ANSWER', payload: { answer } });
}

/**
 * 3. 提交答案 - 判题并更新统计
 */
function submitAnswer(
  dispatch: React.Dispatch<ChoiceQuestionAction>,
  state: ChoiceQuestionState
): void {
  const currentQuestion = state.questions[state.currentIndex];
  if (!currentQuestion || !state.selectedAnswer) return;

  const isCorrect = state.selectedAnswer === currentQuestion.correctAnswer;
  const questionTypeCode = currentQuestion.type === 'pronunciation' ? '01' : '02';

  dispatch({ type: 'SUBMIT', payload: { isCorrect } });
}

/**
 * 4. 继续 - 进入下一题或完成答题
 */
function continueToNext(
  dispatch: React.Dispatch<ChoiceQuestionAction>,
  state: ChoiceQuestionState,
  onComplete: (allCorrect: boolean) => void,
  originalText: string | null
): void {
  const isLastQuestion = state.currentIndex >= state.questions.length - 1;

  if (isLastQuestion) {
    // 预加载拼句子阶段需要的 TTS（后台静默，不阻塞主流程）
    if (originalText) {
      prefetchTextWithMinimax(originalText, 'ja').catch(() => {
        // 预加载失败不影响主流程
      });
    }
    onComplete(state.allCorrect);
  } else {
    dispatch({ type: 'NEXT' });
  }
}

// ============================================
// 组件
// ============================================

interface ChoiceQuestionProps {
  /** 当前记忆卡片数据 */
  memoCard: ExtendedMemoCard;
  /** 完成选择题后的回调，参数为是否全部正确 */
  onComplete: (allCorrect: boolean) => void;
}

export function ChoiceQuestion({ memoCard, onComplete }: ChoiceQuestionProps) {
  const tDaily = useTranslations('dailyTask');
  const t = useTranslations('contextViewer');
  const locale = useLocale();

  const [state, dispatch] = useReducer(choiceQuestionReducer, initialState);

  const { questions, currentIndex, selectedAnswer, isSubmitted } = state;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex >= questions.length - 1;

  // 1. 生成问题
  useEffect(() => {
    initializeQuestions(
      dispatch,
      memoCard.words,
      (key: string, values?: Record<string, any>) => tDaily(key, values),
      locale
    );
  }, []);

  // 2. 选择选项
  const handleAnswerSelect = (answer: string) => selectAnswer(dispatch, answer);

  // 3. 提交答案
  const handleSubmit = () => submitAnswer(dispatch, state);

  // 4. 继续
  const handleContinue = () => continueToNext(dispatch, state, onComplete, memoCard.originalText);

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="flex flex-col bg-[#f4f4f4] mx-auto p-4 rounded-2xl w-[435px] min-h-[600px]">
      {/* 原文消息气泡 */}
      <MessageBubble
        avatarUrl={memoCard.avatarUrl || ''}
        avatarAlt={t('defaultCharacterName')}
        text={memoCard.originalText}
      />

      {/* 主要内容区域 */}
      <div className="flex flex-col flex-1 mt-4">
        {/* 问题和选项区域 */}
        <QuestionOptions
          question={currentQuestion}
          selectedAnswer={selectedAnswer}
          isSubmitted={isSubmitted}
          onSelect={handleAnswerSelect}
        />

        {/* 底部按钮区域 */}
        <ActionPanel
          selectedAnswer={selectedAnswer}
          correctAnswer={currentQuestion.correctAnswer}
          isSubmitted={isSubmitted}
          isLastQuestion={isLastQuestion}
          submitLabel={tDaily('submit')}
          correctLabel={tDaily('correct')}
          correctAnswerLabel={tDaily('correctAnswer')}
          nextLabel={tDaily('nextQuestion')}
          continueLabel={tDaily('continue')}
          onSubmit={handleSubmit}
          onContinue={handleContinue}
        />
      </div>
    </div>
  );
}
