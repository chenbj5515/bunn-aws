import { createStore } from "jotai";

// 全局 store - 可以在任何地方读取/写入 atom 的最新值
export const store = createStore();

// Types
export type { 
  RoundResult, 
  DailyTaskState 
} from "./types";

// Enums
export { TaskPhase } from "./types";

export { 
  createInitialState,
  getCurrentCard,
  getCurrentResult,
  isLastRound,
  isLastPlay,
} from "./types";

// Atoms - 核心状态
export { dailyTaskStateAtom } from "./atoms";

// Atoms - 派生的只读状态
export {
  currentPhaseAtom,
  currentRoundIndexAtom,
  currentPlayCountAtom,
  maxPlayCountAtom,
  cardsAtom,
  resultsAtom,
  currentCardAtom,
  currentResultAtom,
  isLastRoundAtom,
  isLastPlayAtom,
  totalCardsAtom,
  progressPercentAtom,
  taskViewDataAtom,
} from "./atoms";

// Atoms - Actions（修改状态的方法）
export {
  initializeTaskAtom,
  startTaskAtom,
  completePlayAtom,
  submitChoiceAtom,
  submitSentenceAndContinueAtom,
  resetTaskAtom,
  skipRoundAtom,
} from "./atoms";
