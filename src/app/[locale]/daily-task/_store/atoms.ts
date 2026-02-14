import { atom } from "jotai";
import type { DailyTaskState } from "./types";
import { TaskPhase, createInitialState, isLastRound, isLastPlay } from "./types";
import type { ExtendedMemoCard } from "../_components/daily-task-client";

/**
 * 每日任务的核心状态 atom
 */
export const dailyTaskStateAtom = atom<DailyTaskState>(
  createInitialState([])
);

// ============================================
// 派生的只读 atoms（用于获取状态的特定部分）
// ============================================

/** 当前阶段 */
export const currentPhaseAtom = atom((get) => get(dailyTaskStateAtom).phase);

/** 当前轮次索引 */
export const currentRoundIndexAtom = atom((get) => get(dailyTaskStateAtom).currentRoundIndex);

/** 当前播放次数 */
export const currentPlayCountAtom = atom((get) => get(dailyTaskStateAtom).currentPlayCount);

/** 最大播放次数 */
export const maxPlayCountAtom = atom((get) => get(dailyTaskStateAtom).maxPlayCount);

/** 所有卡片 */
export const cardsAtom = atom((get) => get(dailyTaskStateAtom).cards);

/** 所有结果 */
export const resultsAtom = atom((get) => get(dailyTaskStateAtom).results);

/** 当前卡片 */
export const currentCardAtom = atom((get) => {
  const state = get(dailyTaskStateAtom);
  return state.cards[state.currentRoundIndex] ?? null;
});

/** 当前轮次的结果 */
export const currentResultAtom = atom((get) => {
  const state = get(dailyTaskStateAtom);
  return state.results[state.currentRoundIndex] ?? null;
});

/** 是否是最后一轮 */
export const isLastRoundAtom = atom((get) => isLastRound(get(dailyTaskStateAtom)));

/** 是否是当前轮的最后一次播放 */
export const isLastPlayAtom = atom((get) => isLastPlay(get(dailyTaskStateAtom)));

/** 总卡片数 */
export const totalCardsAtom = atom((get) => get(dailyTaskStateAtom).cards.length);

/** 进度百分比（基于轮次） */
export const progressPercentAtom = atom((get) => {
  const state = get(dailyTaskStateAtom);
  if (state.cards.length === 0) return 0;
  if (state.phase === TaskPhase.COMPLETED) return 100;
  return Math.round((state.currentRoundIndex / state.cards.length) * 100);
});

/** 任务视图所需的组合数据 */
export const taskViewDataAtom = atom((get) => ({
  phase: get(currentPhaseAtom),
  currentRoundIndex: get(currentRoundIndexAtom),
  totalCards: get(totalCardsAtom),
}));

// ============================================
// Action Atoms（用于修改状态）
// ============================================

/**
 * 初始化任务状态
 * 用于在组件挂载时设置初始卡片数据
 */
export const initializeTaskAtom = atom(
  null,
  (get, set, cards: ExtendedMemoCard[]) => {
    set(dailyTaskStateAtom, createInitialState(cards));
  }
);

/**
 * 开始任务
 * idle -> playing (第一次播放)
 */
export const startTaskAtom = atom(
  null,
  (get, set) => {
    const state = get(dailyTaskStateAtom);
    if (state.phase !== TaskPhase.IDLE) return;
    
    set(dailyTaskStateAtom, {
      ...state,
      phase: TaskPhase.PLAYING,
      currentPlayCount: 1,
    });
  }
);

/**
 * 完成一次播放
 * - 如果还没播放3次：播放次数+1，继续 playing
 * - 如果已播放3次：进入 choice_question
 */
export const completePlayAtom = atom(
  null,
  (get, set) => {
    const state = get(dailyTaskStateAtom);
    if (state.phase !== TaskPhase.PLAYING) return;
    
    if (state.currentPlayCount < state.maxPlayCount) {
      // 还没播放完，继续下一次播放
      set(dailyTaskStateAtom, {
        ...state,
        currentPlayCount: state.currentPlayCount + 1,
      });
    } else {
      // 播放完成，进入选择题
      set(dailyTaskStateAtom, {
        ...state,
        phase: TaskPhase.CHOICE_QUESTION,
      });
    }
  }
);

/**
 * 提交选择题答案
 * choice_question -> sentence_building
 */
export const submitChoiceAtom = atom(
  null,
  (get, set, isCorrect: boolean) => {
    const state = get(dailyTaskStateAtom);
    if (state.phase !== TaskPhase.CHOICE_QUESTION) return;
    
    // 更新当前轮次的结果
    const currentResult = state.results[state.currentRoundIndex];
    if (!currentResult) return;
    
    const newResults = [...state.results];
    newResults[state.currentRoundIndex] = {
      ...currentResult,
      choiceCorrect: isCorrect,
    };
    
    set(dailyTaskStateAtom, {
      ...state,
      phase: TaskPhase.SENTENCE_BUILDING,
      results: newResults,
    });
  }
);

/**
 * 提交拼句子答案并继续
 * - 如果不是最后一轮：进入下一轮的 playing
 * - 如果是最后一轮：进入 completed
 */
export const submitSentenceAndContinueAtom = atom(
  null,
  (get, set, isCorrect: boolean) => {
    const state = get(dailyTaskStateAtom);
    if (state.phase !== TaskPhase.SENTENCE_BUILDING) return;
    
    // 更新当前轮次的结果
    const currentResult = state.results[state.currentRoundIndex];
    if (!currentResult) return;
    
    const newResults = [...state.results];
    newResults[state.currentRoundIndex] = {
      ...currentResult,
      sentenceCorrect: isCorrect,
    };
    
    if (isLastRound(state)) {
      // 最后一轮，进入结算
      set(dailyTaskStateAtom, {
        ...state,
        phase: TaskPhase.COMPLETED,
        results: newResults,
      });
    } else {
      // 进入下一轮
      set(dailyTaskStateAtom, {
        ...state,
        phase: TaskPhase.PLAYING,
        currentRoundIndex: state.currentRoundIndex + 1,
        currentPlayCount: 1,
        results: newResults,
      });
    }
  }
);

/**
 * 重置任务（重新开始）
 */
export const resetTaskAtom = atom(
  null,
  (get, set) => {
    const state = get(dailyTaskStateAtom);
    set(dailyTaskStateAtom, createInitialState(state.cards));
  }
);

/**
 * 跳过当前轮次（直接进入下一轮或结算）
 * 用于调试或特殊场景
 */
export const skipRoundAtom = atom(
  null,
  (get, set) => {
    const state = get(dailyTaskStateAtom);
    if (state.phase === TaskPhase.IDLE || state.phase === TaskPhase.COMPLETED) return;
    
    if (isLastRound(state)) {
      set(dailyTaskStateAtom, {
        ...state,
        phase: TaskPhase.COMPLETED,
      });
    } else {
      set(dailyTaskStateAtom, {
        ...state,
        phase: TaskPhase.PLAYING,
        currentRoundIndex: state.currentRoundIndex + 1,
        currentPlayCount: 1,
      });
    }
  }
);
