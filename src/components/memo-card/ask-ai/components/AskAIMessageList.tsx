"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useAtomValue } from "jotai";
import { useSession } from "@/lib/auth-client";
import { ChevronDown } from "lucide-react";
import { currentAskAIStateAtom } from "@/app/[locale]/channels/[channelId]/_store";
import { askAIShowLimitAtom, scrollToBottomTriggerAtom } from "../atoms";
import { AskAIMessageItem } from "./AskAIMessageItem";
import Loading from "@/components/ui/loading";
import InlineLimitBanner from "@/components/ui/inline-limit-banner";

interface AskAIMessageListProps {
  memoCard: { id: string };
}

/**
 * 消息列表区域
 */
export function AskAIMessageList({ memoCard: _memoCard }: AskAIMessageListProps) {
  const { data: sessionData } = useSession();
  const askAIState = useAtomValue(currentAskAIStateAtom);
  const showLimit = useAtomValue(askAIShowLimitAtom);
  const scrollTrigger = useAtomValue(scrollToBottomTriggerAtom);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const initialTriggerRef = useRef(scrollTrigger);

  const messages = askAIState?.messages || [];
  const isLoading = askAIState?.isLoading || false;
  const isLoadingHistory = askAIState?.isLoadingHistory || false;

  const userImage = sessionData?.user?.image?.toString();

  // 检测是否已滚动到底部
  const checkIsAtBottom = useCallback(() => {
    if (!containerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // 只要有任何内容被遮挡就返回 false（使用 1px 容差处理小数精度问题）
    return scrollHeight - scrollTop - clientHeight <= 1;
  }, []);

  // 更新向下箭头显示状态
  const updateScrollDownVisibility = () => {
    setShowScrollDown(!checkIsAtBottom());
  }

  // 滚动到底部
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior,
    });
  }, []);

  // 监听滚动触发器（仅当用户主动发送消息时触发）
  useEffect(() => {
    // 跳过初始值，只响应后续变化
    if (scrollTrigger === initialTriggerRef.current) return;
    
    // 使用 setTimeout 确保 DOM 已更新
    setTimeout(() => scrollToBottom("smooth"), 50);
  }, [scrollTrigger, scrollToBottom]);

  // 监听滚动事件，更新箭头显示
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateScrollDownVisibility();
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // 监听内容变化更新箭头状态
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const resizeObserver = new ResizeObserver(() => {
      // 延迟检查，确保 DOM 已更新
      requestAnimationFrame(updateScrollDownVisibility);
    });
    resizeObserver.observe(content);

    return () => resizeObserver.disconnect();
  }, []);

  // 消息变化时也检查箭头状态
  useEffect(() => {
    updateScrollDownVisibility();
  }, [messages]);

  if (isLoadingHistory) {
    return (
      <div className="flex-1 px-4 py-4 min-h-0 overflow-y-auto">
        <Loading />
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={containerRef}
        className="px-4 py-4 h-full overflow-y-auto"
      >
        <div ref={contentRef} className="space-y-4 font-[ui-sans-serif]">
          {/* 限流提示 */}
          {showLimit && (
            <div className="flex justify-center">
              <InlineLimitBanner fontSizePx={19} />
            </div>
          )}

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

      {/* 向下滚动按钮 */}
      {showScrollDown && (
        <button
          onClick={() => scrollToBottom()}
          className="bottom-4 left-1/2 absolute flex justify-center items-center bg-background hover:bg-accent shadow-sm border border-border rounded-full w-8 h-8 transition-colors -translate-x-1/2"
          aria-label="滚动到底部"
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
