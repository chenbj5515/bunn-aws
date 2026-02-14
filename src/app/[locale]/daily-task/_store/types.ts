import type { ExtendedMemoCard } from "../_components/daily-task-client";

/**
 * 任务阶段枚举
 * - IDLE: 初始状态，展示 start-task-view
 * - PLAYING: 播放视频阶段（每轮播放3次）
 * - CHOICE_QUESTION: 选择题阶段
 * - SENTENCE_BUILDING: 拼句子阶段
 * - COMPLETED: 结算状态
 */
export enum TaskPhase {
  IDLE = "idle",
  PLAYING = "playing",
  CHOICE_QUESTION = "choice_question",
  SENTENCE_BUILDING = "sentence_building",
  COMPLETED = "completed",
}

/**
 * 每轮（每个卡片）的答题结果
 */
export interface RoundResult {
  cardId: string;
  /** 选择题是否正确 */
  choiceCorrect: boolean | null;
  /** 拼句子是否正确 */
  sentenceCorrect: boolean | null;
}

/**
 * 每日任务的完整状态
 */
export interface DailyTaskState {
  /** 当前任务阶段 */
  phase: TaskPhase;
  
  /** 当前轮次索引（从0开始，对应cards数组索引） */
  currentRoundIndex: number;
  
  /** 
   * 当前播放次数（1-3）
   * 只在 phase === 'playing' 时有意义
   */
  currentPlayCount: number;
  
  /** 每轮播放的总次数 */
  maxPlayCount: number;
  
  /** 所有卡片数据 */
  cards: ExtendedMemoCard[];
  
  /** 每轮的答题结果 */
  results: RoundResult[];
}

/**
 * 创建初始状态的工厂函数
 */
export function createInitialState(cards: ExtendedMemoCard[]): DailyTaskState {
  return {
    phase: TaskPhase.IDLE,
    currentRoundIndex: 0,
    currentPlayCount: 1,
    maxPlayCount: 3,
    cards,
    results: cards.map(card => ({
      cardId: card.id,
      choiceCorrect: null,
      sentenceCorrect: null,
    })),
  };
}

/**
 * 获取当前轮次的卡片
 */
export function getCurrentCard(state: DailyTaskState): ExtendedMemoCard | null {
  return state.cards[state.currentRoundIndex] ?? null;
}

/**
 * 获取当前轮次的结果
 */
export function getCurrentResult(state: DailyTaskState): RoundResult | null {
  return state.results[state.currentRoundIndex] ?? null;
}

/**
 * 判断是否是最后一轮
 */
export function isLastRound(state: DailyTaskState): boolean {
  return state.currentRoundIndex >= state.cards.length - 1;
}

/**
 * 判断当前播放是否是最后一次
 */
export function isLastPlay(state: DailyTaskState): boolean {
  return state.currentPlayCount >= state.maxPlayCount;
}
