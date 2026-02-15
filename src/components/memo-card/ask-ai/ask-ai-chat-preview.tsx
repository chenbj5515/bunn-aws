"use client";

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { Avatar } from '@/components/ui/avatar';
import { AIContentRenderer } from '../ai-content-renderer';
import type { AskAIMessage } from '@/app/[locale]/channels/[channelId]/_store/types';

interface AskAIChatPreviewProps {
  messages: AskAIMessage[];
  onClick: () => void;
}

/**
 * 问 AI 对话预览框组件
 * 展示对话历史预览，点击展开完整弹窗
 */
export function AskAIChatPreview({ messages, onClick }: AskAIChatPreviewProps) {
  const { data: sessionData } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  const userImage = sessionData?.user?.image?.toString();

  // 检测内容是否溢出
  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && contentRef.current) {
        const isOverflowing = contentRef.current.scrollHeight > containerRef.current.clientHeight;
        setHasOverflow(isOverflowing);
      }
    };

    checkOverflow();
    // 监听窗口大小变化
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [messages]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className="relative bg-white rounded-xl border border-gray-200 p-4 h-[140px] overflow-hidden cursor-pointer shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200"
    >
      {/* 对话内容 */}
      <div ref={contentRef} className="space-y-3">
        {messages.map((msg, idx) => (
          <PreviewMessageItem
            key={msg.id || idx}
            message={msg}
            userImage={userImage}
          />
        ))}
      </div>

      {/* 底部渐变遮罩 + 向下箭头 */}
      {hasOverflow && (
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-white via-white/80 to-transparent flex items-end justify-center pb-2 pointer-events-none">
          <div className="bg-white/90 rounded-full p-1 shadow-sm border border-gray-200">
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 预览消息项组件
 */
function PreviewMessageItem({
  message,
  userImage,
}: {
  message: AskAIMessage;
  userImage?: string;
}) {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex ${isAssistant ? 'flex-row' : 'flex-row-reverse'} max-w-[90%] gap-2`}>
        {/* 头像 */}
        <div className="shrink-0">
          {isAssistant ? (
            <PreviewAssistantAvatar />
          ) : (
            <PreviewUserAvatar image={userImage} />
          )}
        </div>

        {/* 消息内容 */}
        <div className="text-[13px] leading-[1.7] text-gray-700">
          <AIContentRenderer content={message.content} />
        </div>
      </div>
    </div>
  );
}

/**
 * 预览框 AI 头像（小尺寸）
 */
function PreviewAssistantAvatar() {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-gray-500">Bunn</span>
      <Image
        src="/images/logo.jpeg"
        alt="Bunn"
        width={24}
        height={24}
        className="rounded-[3px] w-[24px] h-[24px]"
      />
    </div>
  );
}

/**
 * 预览框用户头像（小尺寸）
 */
function PreviewUserAvatar({ image }: { image?: string }) {
  return (
    <Avatar className="w-6 h-6">
      {image && <img src={image} alt="User" />}
    </Avatar>
  );
}
