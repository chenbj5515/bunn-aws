"use client";

import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  currentAskAICardIdAtom,
  currentAskAIStateAtom,
  clearAskAIPendingActionAtom,
} from "@/app/[locale]/channels/[channelId]/_store";
import { resetDialogLocalStateAtom } from "../atoms";
import { useSendToAI } from "./useSendToAI";
import type { MemoCardData } from "../types";

/**
 * 唯一的初始化 Hook
 * 负责：
 * 1. 禁止背景滚动
 * 2. 处理 pending action（弹窗打开后自动执行语法分析或发送问题）
 * 3. 清理资源
 */
export function useAskAIInit(memoCard: MemoCardData) {
  const cardId = useAtomValue(currentAskAICardIdAtom);
  const askAIState = useAtomValue(currentAskAIStateAtom);
  const clearPendingAction = useSetAtom(clearAskAIPendingActionAtom);
  const resetLocalState = useSetAtom(resetDialogLocalStateAtom);
  const { sendToAI, abortRequest } = useSendToAI(memoCard);
  const pendingAction = askAIState?.pendingAction;
  const pendingQuestion = askAIState?.pendingQuestion;

  useEffect(() => {
    if (!cardId) {
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
      abortRequest();
      resetLocalState();
    };
  }, [cardId, abortRequest, resetLocalState]);

  useEffect(() => {
    if (!cardId || !pendingAction) return;

    const timer = setTimeout(() => {
      // 发送动作真正执行时再清空 pending，避免 effect 清理导致动作丢失
      clearPendingAction(cardId);
      if (pendingAction === "grammar") {
        sendToAI("", true);
        return;
      }
      if (pendingAction === "question" && pendingQuestion) {
        sendToAI(pendingQuestion, false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [cardId, pendingAction, pendingQuestion, clearPendingAction, sendToAI]);
}
