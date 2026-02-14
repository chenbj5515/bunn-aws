import type { RoundResult } from '../../_store/types';

/**
 * 结算组件的状态
 */
export interface SettlementState {
  /** 动画是否已完成 */
  animationComplete: boolean;
  /** 是否显示下一轮按钮 */
  showNextButton: boolean;
}

/**
 * 结算组件的 Action 类型
 */
export type SettlementAction =
  | { type: 'ANIMATION_COMPLETE' }
  | { type: 'SHOW_NEXT_BUTTON' }
  | { type: 'RESET' };

/**
 * 初始状态
 */
export const initialState: SettlementState = {
  animationComplete: false,
  showNextButton: false,
};

/**
 * Reducer 函数
 */
export function settlementReducer(
  state: SettlementState,
  action: SettlementAction
): SettlementState {
  switch (action.type) {
    case 'ANIMATION_COMPLETE':
      return {
        ...state,
        animationComplete: true,
      };

    case 'SHOW_NEXT_BUTTON':
      return {
        ...state,
        showNextButton: true,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}
