'use client';

import type { WordSegment } from '@/types/extended-memo-card';

// ============================================
// 状态类型
// ============================================

export interface SentenceBuildingState {
  /** 打乱后的可用片段列表 */
  shuffledSegments: WordSegment[];
  /** 已选中的片段 ID 列表（有序） */
  selectedSegmentIds: string[];
  /** TTS 是否正在播放 */
  isPlaying: boolean;
  /** 是否已展示结果 */
  showResult: boolean;
  /** 答案是否正确 */
  isCorrect: boolean | null;
}

export const initialState: SentenceBuildingState = {
  shuffledSegments: [],
  selectedSegmentIds: [],
  isPlaying: false,
  showResult: false,
  isCorrect: null,
};

// ============================================
// Action 类型
// ============================================

export type SentenceBuildingAction =
  | { type: 'INITIALIZE'; payload: { segments: WordSegment[] } }
  | { type: 'SELECT_SEGMENT'; payload: { segmentId: string } }
  | { type: 'DESELECT_SEGMENT'; payload: { segmentId: string } }
  | { type: 'SET_PLAYING'; payload: { isPlaying: boolean } }
  | { type: 'SUBMIT'; payload: { isCorrect: boolean } };

// ============================================
// Reducer
// ============================================

export function sentenceBuildingReducer(
  state: SentenceBuildingState,
  action: SentenceBuildingAction
): SentenceBuildingState {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...initialState,
        shuffledSegments: action.payload.segments,
      };

    case 'SELECT_SEGMENT':
      // 已选中则忽略
      if (state.selectedSegmentIds.includes(action.payload.segmentId)) {
        return state;
      }
      return {
        ...state,
        selectedSegmentIds: [...state.selectedSegmentIds, action.payload.segmentId],
      };

    case 'DESELECT_SEGMENT':
      return {
        ...state,
        selectedSegmentIds: state.selectedSegmentIds.filter(
          (id) => id !== action.payload.segmentId
        ),
      };

    case 'SET_PLAYING':
      return {
        ...state,
        isPlaying: action.payload.isPlaying,
      };

    case 'SUBMIT':
      return {
        ...state,
        showResult: true,
        isCorrect: action.payload.isCorrect,
      };

    default:
      return state;
  }
}
