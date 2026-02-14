"use client";

import { atom } from "jotai";
import { currentAskAIStateAtom } from "@/app/[locale]/channels/[channelId]/_store";

// ============================================
// 对话弹窗局部状态 Atoms
// ============================================

/**
 * 输入框内容
 */
export const askAIInputAtom = atom("");

/**
 * 是否显示限流提示
 */
export const askAIShowLimitAtom = atom(false);

/**
 * IME 输入法合成状态（日语输入等）
 */
export const askAIIsComposingAtom = atom(false);

/**
 * 消息 ID 计数器（用于生成唯一 ID）
 */
export const messageIdCounterAtom = atom(0);

// ============================================
// 派生状态 Atoms
// ============================================

/**
 * 是否可以提交消息
 */
export const canSubmitAtom = atom((get) => {
  const input = get(askAIInputAtom);
  const state = get(currentAskAIStateAtom);
  const isComposing = get(askAIIsComposingAtom);
  const showLimit = get(askAIShowLimitAtom);

  const hasInput = input.trim().length > 0;
  const isLoading = state?.isLoading ?? false;
  const isLoadingHistory = state?.isLoadingHistory ?? false;

  return hasInput && !isLoading && !isLoadingHistory && !isComposing && !showLimit;
});

/**
 * 生成唯一消息 ID
 */
export const generateMessageIdAtom = atom(
  null,
  (get, set, prefix: string = "msg") => {
    const counter = get(messageIdCounterAtom);
    set(messageIdCounterAtom, counter + 1);
    return `${prefix}_${Date.now()}_${counter + 1}`;
  }
);

/**
 * 重置对话弹窗局部状态
 */
export const resetDialogLocalStateAtom = atom(null, (_get, set) => {
  set(askAIInputAtom, "");
  set(askAIShowLimitAtom, false);
  set(askAIIsComposingAtom, false);
});
