// ============================================
// 类型定义
// ============================================

export interface Question {
  word: string;
  type: 'meaning' | 'pronunciation';
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface ChoiceQuestionState {
  questions: Question[];        // 问题列表
  currentIndex: number;         // 当前问题索引
  selectedAnswer: string | null; // 当前选中的答案
  isSubmitted: boolean;         // 当前题是否已提交
  allCorrect: boolean;          // 所有回答是否都正确
}

export type ChoiceQuestionAction =
  | { type: 'INITIALIZE'; payload: { questions: Question[] } }
  | { type: 'SELECT_ANSWER'; payload: { answer: string } }
  | { type: 'SUBMIT'; payload: { isCorrect: boolean } }
  | { type: 'NEXT' };

// ============================================
// 初始状态
// ============================================

export const initialState: ChoiceQuestionState = {
  questions: [],
  currentIndex: 0,
  selectedAnswer: null,
  isSubmitted: false,
  allCorrect: true,
};

// ============================================
// Reducer
// ============================================

export function choiceQuestionReducer(
  state: ChoiceQuestionState,
  action: ChoiceQuestionAction
): ChoiceQuestionState {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...initialState,
        questions: action.payload.questions,
      };

    case 'SELECT_ANSWER':
      return {
        ...state,
        selectedAnswer: action.payload.answer,
      };

    case 'SUBMIT':
      return {
        ...state,
        isSubmitted: true,
        allCorrect: state.allCorrect && action.payload.isCorrect,
      };

    case 'NEXT':
      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        selectedAnswer: null,
        isSubmitted: false,
      };

    default:
      return state;
  }
}
