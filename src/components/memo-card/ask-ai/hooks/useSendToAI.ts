"use client";

import { useRef, useCallback } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { useLocale } from "next-intl";
import {
  currentAskAIStateAtom,
  setAskAILoadingAtom,
  appendMessageAtom,
  setMessageContentAtom,
  removeMessageAtom,
} from "@/app/[locale]/channels/[channelId]/_store";
import { askAIShowLimitAtom, triggerScrollToBottomAtom } from "../atoms";
import {
  generateUniqueId,
  createUserMessage,
  createAIPlaceholder,
  getContextText,
  getTargetLocale,
} from "../utils";
import { getTranslationByLocale } from "@/lib/translation-utils";
import { saveMemoCardMessage } from "../../server-functions/memo-card-messages";
import {
  getGrammarAnalysisPrompt,
  getFollowUpPrompt,
  buildDialogueHistory,
  getAdditionalInstruction,
} from "@/prompts";
import { ERROR_CODES } from "@/server/constants";
import type { MemoCardData } from "../types";

/**
 * AI 通信 Hook
 * 负责：
 * 1. 发送消息到 AI
 * 2. 处理流式响应（使用 Vercel AI SDK 的 Data Stream 格式）
 * 3. 保存消息到数据库
 */
export function useSendToAI(memoCard: MemoCardData) {
  const locale = useLocale();
  const askAIState = useAtomValue(currentAskAIStateAtom);
  const setLoading = useSetAtom(setAskAILoadingAtom);
  const appendMessage = useSetAtom(appendMessageAtom);
  const setMessageContent = useSetAtom(setMessageContentAtom);
  const removeMessage = useSetAtom(removeMessageAtom);
  const setShowLimit = useSetAtom(askAIShowLimitAtom);
  const triggerScrollToBottom = useSetAtom(triggerScrollToBottomAtom);

  const abortControllerRef = useRef<AbortController | null>(null);

  const targetLocale = getTargetLocale(locale);

  /**
   * 发送消息到 AI
   */
  const sendToAI = useCallback(async (userInput: string, isInitialPrompt = false) => {
    const cardId = memoCard.id;
    if (!cardId) return;

    try {
      setLoading({ cardId, isLoading: true });

      // 获取当前消息列表（用于构建对话历史）
      const currentMessages = askAIState?.messages || [];

      // 如果有用户输入，添加到消息列表
      if (userInput.trim()) {
        const userMessage = createUserMessage(userInput);
        appendMessage({ cardId, message: userMessage });

        // 触发滚动到底部，确保用户能看到自己发送的消息
        triggerScrollToBottom();

        // 保存用户消息到数据库
        await saveMessageToDatabase(cardId, "user", userInput, false);
      }

      // 中止之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // 构建系统提示
      const contextText = getContextText(memoCard.contextInfo, locale);
      const systemPrompt = isInitialPrompt
        ? getGrammarAnalysisPrompt({
            originalText: memoCard.originalText || "无",
            translation:
              getTranslationByLocale(memoCard.translation, locale) || "无",
            contextText: contextText || undefined,
            targetLocale,
          })
        : getFollowUpPrompt({
            originalText: memoCard.originalText || "无",
            targetLocale,
          });

      // 构建对话历史
      const dialogueHistory = buildDialogueHistory(
        currentMessages.map((msg) => ({ role: msg.role, content: msg.content })),
        userInput.trim() || undefined
      );

      // 获取附加指令
      const additionalInstruction = getAdditionalInstruction(isInitialPrompt);

      const fullPrompt = `${systemPrompt}${dialogueHistory}${additionalInstruction}`;

      // 创建 AI 消息占位
      const aiMessageId = generateUniqueId("ai");
      const aiPlaceholder = createAIPlaceholder(aiMessageId, isInitialPrompt);
      appendMessage({ cardId, message: aiPlaceholder });

      // 触发滚动，让用户看到 AI 正在回复
      triggerScrollToBottom();

      let aiMessage = "";

      try {
        // 使用新的流式 API
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: fullPrompt,
            model: "gpt-4o-mini",
          }),
          signal: abortControllerRef.current.signal,
        });

        // 处理非流式错误响应
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.errorCode === ERROR_CODES.TOKEN_LIMIT_EXCEEDED) {
            setShowLimit(true);
          }
          removeMessage({ cardId, messageId: aiMessageId });
          return;
        }

        // 检查是否有响应体
        if (!response.body) {
          console.error("响应没有 body");
          removeMessage({ cardId, messageId: aiMessageId });
          return;
        }

        // 处理纯文本流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // 检查是否被中止
          if (abortControllerRef.current?.signal.aborted) {
            reader.cancel();
            break;
          }

          // 解码文本块
          const chunk = decoder.decode(value, { stream: true });
          
          if (chunk) {
            aiMessage += chunk;
            setMessageContent({
              cardId,
              messageId: aiMessageId,
              content: aiMessage,
            });
          }
        }

        // 流结束后保存 AI 消息到数据库
        if (aiMessage.trim()) {
          await saveMessageToDatabase(
            cardId,
            "assistant",
            aiMessage,
            isInitialPrompt
          );
        }
      } catch (error) {
        // 忽略中止错误
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        console.error("流式调用错误:", error);
        removeMessage({ cardId, messageId: aiMessageId });
      }
    } catch (error) {
      console.error("处理错误:", error);
    } finally {
      setLoading({ cardId, isLoading: false });
    }
  }, [
    memoCard.id,
    memoCard.originalText,
    memoCard.translation,
    memoCard.contextInfo,
    askAIState?.messages,
    locale,
    targetLocale,
    setLoading,
    appendMessage,
    setMessageContent,
    removeMessage,
    setShowLimit,
    triggerScrollToBottom,
  ]);

  /**
   * 中止当前请求
   */
  const abortRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return { sendToAI, abortRequest };
}

/**
 * 保存消息到数据库
 */
async function saveMessageToDatabase(
  cardId: string,
  role: "user" | "assistant",
  content: string,
  isInitial: boolean
) {
  try {
    const result = await saveMemoCardMessage(cardId, role, content, isInitial);
    if (!result.success) {
      console.error("保存消息失败:", result.error);
    }
  } catch (error) {
    console.error("保存消息出错:", error);
  }
}
