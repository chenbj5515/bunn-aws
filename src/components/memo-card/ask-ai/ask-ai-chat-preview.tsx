"use client";

import { useRef, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

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

  // 简化消息内容，移除 markdown 标记
  const simplifyContent = (content: string): string => {
    return content
      .replace(/#{1,6}\s/g, '') // 移除标题标记
      .replace(/\*\*/g, '')     // 移除粗体标记
      .replace(/\*/g, '')       // 移除斜体标记
      .replace(/`/g, '')        // 移除代码标记
      .replace(/\n+/g, ' ')     // 换行替换为空格
      .trim();
  };

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className="relative bg-white rounded-xl border border-gray-200 p-4 h-[140px] overflow-hidden cursor-pointer shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200"
    >
      {/* 对话内容 */}
      <div ref={contentRef} className="space-y-2 text-[14px] leading-relaxed">
        {messages.map((msg, idx) => (
          <div key={msg.id || idx} className="flex gap-2">
            <span className={`font-medium shrink-0 ${msg.role === 'user' ? 'text-blue-600' : 'text-purple-600'}`}>
              {msg.role === 'user' ? '你:' : 'Bunn:'}
            </span>
            <span className="text-gray-700 line-clamp-2">
              {simplifyContent(msg.content)}
            </span>
          </div>
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
