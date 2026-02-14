"use client";

import Image from "next/image";
import { Avatar } from "@/components/ui/avatar";
import { AIContentRenderer } from "../../ai-content-renderer";
import type { AskAIMessage } from "@/app/[locale]/channels/[channelId]/_store/types";

interface AskAIMessageItemProps {
  message: AskAIMessage;
  isLoading: boolean;
  userImage?: string | null;
}

/**
 * 单条消息组件
 */
export function AskAIMessageItem({
  message,
  isLoading,
  userImage,
}: AskAIMessageItemProps) {
  const isAssistant = message.role === "assistant";
  const showLoadingIndicator = isAssistant && isLoading && !message.content;

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`flex ${isAssistant ? "flex-row" : "flex-row-reverse"} w-full md:max-w-[80%]`}
      >
        {/* 头像区域 */}
        <div className="hidden md:block z-10 relative mr-3 shrink-0">
          {isAssistant ? (
            <AssistantAvatar isLoading={showLoadingIndicator} />
          ) : (
            <UserAvatar image={userImage} />
          )}
        </div>

        {/* 消息内容 */}
        <div
          className={`rounded-lg text-[14px] leading-[1.9] tracking-[0.5px] ${
            isAssistant ? "md:ml-[-40px] md:pl-[52px]" : ""
          }`}
        >
          {message.content ? (
            <AIContentRenderer content={message.content} />
          ) : showLoadingIndicator ? (
            <div className="md:hidden bg-black rounded-full w-4 h-4 animate-breathing-strong" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * AI 助手头像
 */
function AssistantAvatar({ isLoading }: { isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-black rounded-full w-[20px] h-[20px] animate-breathing-strong" />
    );
  }

  return (
    <div className="flex flex-col items-center">
      <span className="-mt-[4px] font-sans text-[12px] text-center">Bunn</span>
      <Image
        src="/assets/logo.jpeg"
        alt="Bunn"
        width={32}
        height={32}
        className="rounded-[4px] w-[32px] h-[32px]"
      />
    </div>
  );
}

/**
 * 用户头像
 */
function UserAvatar({ image }: { image?: string | null }) {
  return (
    <div className="flex items-center h-full">
      <Avatar className="w-10 h-10">
        {image && <img src={image} alt="User" />}
      </Avatar>
    </div>
  );
}
