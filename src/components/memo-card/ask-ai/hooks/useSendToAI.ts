"use client";

import { useRef } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { useLocale } from "next-intl";
import {
  currentAskAIStateAtom,
  setAskAILoadingAtom,
  appendMessageAtom,
  setMessageContentAtom,
  removeMessageAtom,
} from "@/app/[locale]/channels/[channelId]/_store";
import { askAIShowLimitAtom } from "../atoms";
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
import { vanillaTrpc } from "@/lib/trpc/client";
import { ERROR_CODES } from "@/server/constants";
import type { MemoCardData } from "../types";

/**
 * AI 通信 Hook
 * 负责：
 * 1. 发送消息到 AI
 * 2. 处理流式响应
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

  const abortControllerRef = useRef<AbortController | null>(null);

  const targetLocale = getTargetLocale(locale);

  /**
   * 发送消息到 AI
   */
  const sendToAI = async (userInput: string, isInitialPrompt = false) => {
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

      let aiMessage = "";

      try {
        // 使用 tRPC 流式调用
        const stream = await vanillaTrpc.ai.streamChat.mutate({
          prompt: fullPrompt,
          model: "gpt-4o-mini",
        });

        // 处理流式响应
        for await (const chunk of stream) {
          // 检查是否被中止
          if (abortControllerRef.current?.signal.aborted) {
            break;
          }

          if (chunk.type === "error") {
            // 处理错误
            if (chunk.errorCode === ERROR_CODES.TOKEN_LIMIT_EXCEEDED) {
              setShowLimit(true);
            }
            // 移除占位消息
            removeMessage({ cardId, messageId: aiMessageId });
            return;
          }

          if (chunk.type === "delta") {
            aiMessage += chunk.content;
            // 更新消息内容
            setMessageContent({
              cardId,
              messageId: aiMessageId,
              content: aiMessage,
            });
          }

          if (chunk.type === "done") {
            // 保存 AI 消息到数据库
            await saveMessageToDatabase(
              cardId,
              "assistant",
              aiMessage,
              isInitialPrompt
            );
          }
        }
      } catch (error) {
        console.error("tRPC 流式调用错误:", error);
        // 移除占位消息
        removeMessage({ cardId, messageId: aiMessageId });
      }
    } catch (error) {
      console.error("处理错误:", error);
    } finally {
      setLoading({ cardId, isLoading: false });
    }
  };

  /**
   * 中止当前请求
   */
  const abortRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

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
