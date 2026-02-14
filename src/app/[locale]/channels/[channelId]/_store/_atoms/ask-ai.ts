import { atom } from "jotai";
import type { AskAIState, AskAIMessage, AskAIPendingAction } from "../types";
import { AskAIStage, createInitialAskAIState } from "../types";
import { getCardMessages } from "@/components/memo-card/server-functions/get-card-messages";

// ============================================
// 核心状态
// ============================================

/**
 * 所有卡片的问 AI 状态 Map
 * key: memoCardId, value: AskAIState
 */
export const askAIStateMapAtom = atom<Map<string, AskAIState>>(new Map());

/**
 * 当前打开弹窗的卡片 ID
 */
export const currentAskAICardIdAtom = atom<string | null>(null);

// ============================================
// 派生状态
// ============================================

/**
 * 获取指定卡片的问 AI 状态
 */
export const getAskAIStateAtom = atom((get) => {
  return (cardId: string): AskAIState => {
    const map = get(askAIStateMapAtom);
    return map.get(cardId) || createInitialAskAIState();
  };
});

/**
 * 当前打开弹窗的卡片状态
 */
export const currentAskAIStateAtom = atom((get) => {
  const cardId = get(currentAskAICardIdAtom);
  if (!cardId) return null;
  const map = get(askAIStateMapAtom);
  return map.get(cardId) || null;
});

/**
 * 当前弹窗是否打开
 */
export const isAskAIDialogOpenAtom = atom((get) => {
  const state = get(currentAskAIStateAtom);
  return state?.stage === AskAIStage.DialogOpen;
});

// ============================================
// Action Atoms
// ============================================

/**
 * 更新指定卡片的问 AI 状态
 */
export const updateAskAIStateAtom = atom(
  null,
  (get, set, payload: { cardId: string; state: Partial<AskAIState> }) => {
    const map = new Map(get(askAIStateMapAtom));
    const currentState = map.get(payload.cardId) || createInitialAskAIState();
    map.set(payload.cardId, { ...currentState, ...payload.state });
    set(askAIStateMapAtom, map);
  }
);

/**
 * 初始化卡片的问 AI 状态
 * 检查是否有历史消息，决定显示输入框还是预览框
 */
export const initializeAskAIAtom = atom(
  null,
  async (get, set, payload: { cardId: string; messages?: AskAIMessage[] }) => {
    const { cardId, messages: preloadedMessages } = payload;
    
    // 如果有预加载的消息
    if (preloadedMessages && preloadedMessages.length > 0) {
      const formattedMessages: AskAIMessage[] = preloadedMessages.map(msg => ({
        ...msg,
        isHistory: true,
      }));
      
      set(updateAskAIStateAtom, {
        cardId,
        state: {
          stage: AskAIStage.HasHistory,
          messages: formattedMessages,
          isLoadingHistory: false,
        },
      });
      return true;
    }

    // 标记正在加载
    set(updateAskAIStateAtom, {
      cardId,
      state: { isLoadingHistory: true },
    });

    try {
      // 从服务器加载历史消息
      const result = await getCardMessages(cardId);

      if (result.success && result.messages.length > 0) {
        const formattedMessages: AskAIMessage[] = result.messages.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          isInitialAnalysis: msg.isInitialAnalysis ?? false,
          isHistory: true,
        }));

        set(updateAskAIStateAtom, {
          cardId,
          state: {
            stage: AskAIStage.HasHistory,
            messages: formattedMessages,
            isLoadingHistory: false,
          },
        });
        return true;
      }

      // 没有历史消息，保持 Idle 状态
      set(updateAskAIStateAtom, {
        cardId,
        state: {
          stage: AskAIStage.Idle,
          messages: [],
          isLoadingHistory: false,
        },
      });
      return false;
    } catch (error) {
      console.error('加载问 AI 历史消息失败:', error);
      set(updateAskAIStateAtom, {
        cardId,
        state: {
          stage: AskAIStage.Idle,
          isLoadingHistory: false,
        },
      });
      return false;
    }
  }
);

/**
 * 打开问 AI 弹窗
 */
export const openAskAIDialogAtom = atom(
  null,
  (_get, set, payload: {
    cardId: string;
    action?: AskAIPendingAction;
    question?: string;
  }) => {
    const { cardId, action, question } = payload;

    // 设置当前弹窗卡片 ID
    set(currentAskAICardIdAtom, cardId);

    // 更新状态为弹窗打开
    set(updateAskAIStateAtom, {
      cardId,
      state: {
        stage: AskAIStage.DialogOpen,
        pendingAction: action,
        pendingQuestion: question,
      },
    });
  }
);

/**
 * 关闭问 AI 弹窗
 */
export const closeAskAIDialogAtom = atom(
  null,
  (get, set) => {
    const cardId = get(currentAskAICardIdAtom);
    if (!cardId) return;

    const map = get(askAIStateMapAtom);
    const currentState = map.get(cardId);

    // 根据是否有消息决定回退到哪个状态
    const hasMessages = currentState?.messages && currentState.messages.length > 0;
    const newStage = hasMessages ? AskAIStage.HasHistory : AskAIStage.Idle;

    set(updateAskAIStateAtom, {
      cardId,
      state: {
        stage: newStage,
        pendingAction: undefined,
        pendingQuestion: undefined,
      },
    });

    // 清除当前弹窗卡片 ID
    set(currentAskAICardIdAtom, null);
  }
);

/**
 * 更新消息列表（流式更新时使用）
 */
export const updateAskAIMessagesAtom = atom(
  null,
  (get, set, payload: { cardId: string; messages: AskAIMessage[] }) => {
    const { cardId, messages } = payload;
    
    set(updateAskAIStateAtom, {
      cardId,
      state: { messages },
    });
  }
);

/**
 * 设置加载状态
 */
export const setAskAILoadingAtom = atom(
  null,
  (_get, set, payload: { cardId: string; isLoading: boolean }) => {
    set(updateAskAIStateAtom, {
      cardId: payload.cardId,
      state: { isLoading: payload.isLoading },
    });
  }
);

/**
 * 清除待执行动作
 */
export const clearAskAIPendingActionAtom = atom(
  null,
  (_get, set, cardId: string) => {
    set(updateAskAIStateAtom, {
      cardId,
      state: {
        pendingAction: undefined,
        pendingQuestion: undefined,
      },
    });
  }
);

// ============================================
// 消息操作辅助 Atoms
// ============================================

/**
 * 追加单条消息
 */
export const appendMessageAtom = atom(
  null,
  (get, set, payload: { cardId: string; message: AskAIMessage }) => {
    const map = get(askAIStateMapAtom);
    const state = map.get(payload.cardId) || createInitialAskAIState();
    const messages = [...state.messages, payload.message];
    set(updateAskAIMessagesAtom, { cardId: payload.cardId, messages });
  }
);

/**
 * 更新特定消息的内容（流式更新用，追加内容）
 */
export const updateMessageContentAtom = atom(
  null,
  (get, set, payload: { cardId: string; messageId: string; content: string }) => {
    const map = get(askAIStateMapAtom);
    const state = map.get(payload.cardId) || createInitialAskAIState();
    const messages = state.messages.map(msg =>
      msg.id === payload.messageId
        ? { ...msg, content: msg.content + payload.content }
        : msg
    );
    set(updateAskAIMessagesAtom, { cardId: payload.cardId, messages });
  }
);

/**
 * 设置特定消息的完整内容（替换而非追加）
 */
export const setMessageContentAtom = atom(
  null,
  (get, set, payload: { cardId: string; messageId: string; content: string }) => {
    const map = get(askAIStateMapAtom);
    const state = map.get(payload.cardId) || createInitialAskAIState();
    const messages = state.messages.map(msg =>
      msg.id === payload.messageId
        ? { ...msg, content: payload.content }
        : msg
    );
    set(updateAskAIMessagesAtom, { cardId: payload.cardId, messages });
  }
);

/**
 * 移除特定消息
 */
export const removeMessageAtom = atom(
  null,
  (get, set, payload: { cardId: string; messageId: string }) => {
    const map = get(askAIStateMapAtom);
    const state = map.get(payload.cardId) || createInitialAskAIState();
    const messages = state.messages.filter(msg => msg.id !== payload.messageId);
    set(updateAskAIMessagesAtom, { cardId: payload.cardId, messages });
  }
);
