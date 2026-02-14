"use client";

import { useRef, useEffect } from "react";
import { useAtomValue } from "jotai";
import { useSession } from "@/lib/auth-client";
import { useLocale } from "next-intl";
import { currentAskAIStateAtom } from "@/app/[locale]/channels/[channelId]/_store";
import { askAIShowLimitAtom } from "../atoms";
import { AskAIMessageItem } from "./AskAIMessageItem";
import { AskAIContextDisplay } from "./AskAIContextDisplay";
import Loading from "@/components/ui/loading";
import InlineLimitBanner from "@/components/ui/inline-limit-banner";
import { getContextText } from "../utils";
import type { MemoCardData } from "../types";

interface AskAIMessageListProps {
  memoCard: MemoCardData;
}

/**
 * 消息列表区域
 */
export function AskAIMessageList({ memoCard }: AskAIMessageListProps) {
  const locale = useLocale();
  const { data: sessionData } = useSession();
  const askAIState = useAtomValue(currentAskAIStateAtom);
  const showLimit = useAtomValue(askAIShowLimitAtom);

  const containerRef = useRef<HTMLDivElement>(null);

  const messages = askAIState?.messages || [];
  const isLoading = askAIState?.isLoading || false;
  const isLoadingHistory = askAIState?.isLoadingHistory || false;

  // 调试：输出消息列表状态
  console.log("[AskAIMessageList] messages:", messages);

  const contextText = getContextText(memoCard.contextInfo, locale);
  const userImage = sessionData?.user?.image?.toString();
  
  // 检查是否有历史消息，如果有则不显示上下文（避免重复）
  const hasHistoryMessages = messages.some((msg) => msg.isHistory);

  // 滚动到最新消息（这是允许的 useEffect，用于 DOM 操作）
  useEffect(() => {
    if (!containerRef.current || !messages.length) return;

    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (isNearBottom) {
      const timer = setTimeout(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  if (isLoadingHistory) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        <Loading />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4 min-h-0"
    >
      <div className="space-y-4 font-[ui-sans-serif]">
        {/* 限流提示 */}
        {showLimit && (
          <div className="flex justify-center">
            <InlineLimitBanner fontSizePx={19} />
          </div>
        )}

        {/* 上下文展示（仅在没有历史消息时显示） */}
        {!hasHistoryMessages && <AskAIContextDisplay contextText={contextText} />}

        {/* 消息列表 */}
        {messages.map((message) => (
          <AskAIMessageItem
            key={message.id}
            message={message}
            isLoading={isLoading}
            userImage={userImage}
          />
        ))}
      </div>
    </div>
  );
}
