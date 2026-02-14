"use client"

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { useSession } from '@/lib/auth-client';
import { Avatar } from '@/components/ui/avatar';
import { AIContentRenderer } from './ai-content-renderer';
import { useGrammarAnalysisChat } from '../../hooks/use-grammar-analysis-chat';
import InlineLimitBanner from '@/components/ui/inline-limit-banner';
import { createPortal } from 'react-dom';
import Loading from '../ui/loading';

interface HistoryMessage {
  id: string;
  role: string;
  content: string;
  isInitialAnalysis: boolean;
  createTime: string;
  messageOrder: number;
}

interface GrammarAnalysisDialogProps {
  memoCard: {
    id: string;
    originalText: string | null;
    translation: Record<string, string> | string;
    messages?: HistoryMessage[];
  };
  setDisplayCards: React.Dispatch<React.SetStateAction<any>>;
  onClose: () => void;
  isMobile?: boolean;
  // 新增：内联渲染与滚动锁开关
  renderInPlace?: boolean;
  lockBodyScroll?: boolean;
  // 新增：下一题回调
  onNext?: () => void;
}

export function GrammarAnalysisDialog({ memoCard, setDisplayCards, onClose, isMobile = false, renderInPlace = false, lockBodyScroll = true, onNext }: GrammarAnalysisDialogProps) {
  const t = useTranslations('grammarAnalysis');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { data: sessionData } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const firstMessageRef = useRef(true);
  const [showLimit, setShowLimit] = useState(false);
  const [mounted, setMounted] = useState(false);
  const prevMessagesLengthRef = useRef(0); // 用于跟踪消息数量的变化

  // 读取记忆卡片上下文（与聊天hook一致的回退策略）
  const getContextText = (): string => {
    try {
      const info = (memoCard as any).contextInfo as any[] | undefined;
      const locale = (typeof window !== 'undefined' ? (window as any).__NEXT_DATA__?.props?.pageProps?.locale : undefined) || undefined;
      if (Array.isArray(info) && info.length > 0) {
        const item = info[0];
        if (item) {
          // @ts-ignore
          return (locale && item[locale as string]) || item.zh || item.en || item['zh-TW'] || '';
        }
      }
      return '';
    } catch {
      return '';
    }
  };

  // 使用自定义hook处理聊天逻辑
  const {
    messages,
    isLoading,
    isLoadingMessages,
    sendToAI,
    initializeChat,
    cleanup
  } = useGrammarAnalysisChat({
    memoCard,
    setDisplayCards,
    onError: (error) => {
      // 若已知是限流/配额类错误，直接显示限流弹窗
      const msg = String((error as Error)?.message || '');
      if (/limit|quota|exceeded|429|Forbidden|rate/i.test(msg)) {
        setShowLimit(true);
        return;
      }
      console.error('聊天错误:', error);
    }
  });

  // 处理消息变化时的滚动
  useEffect(() => {
    // 如果消息数量增加，说明有新消息
    if (messages.length > prevMessagesLengthRef.current) {
      // 检查是否有新消息（非历史消息）
      const hasNewMessages = messages.some(msg => !msg.isHistory);

      if (hasNewMessages && chatContainerRef.current) {
        // 延迟一点时间，确保DOM已更新
        setTimeout(() => {
          const chatContainer = chatContainerRef.current;
          if (chatContainer) {
            // 检查用户是否在底部附近
            const { scrollTop, scrollHeight, clientHeight } = chatContainer;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100; // 如果距离底部小于100px，认为在底部附近

            // 只有当用户在底部附近时才自动滚动
            if (isNearBottom) {
              // 计算滚动位置，让新消息的开头可见
              const maxScroll = scrollHeight - clientHeight;

              // 平滑滚动到新消息的开头
              chatContainer.scrollTo({
                top: maxScroll,
                behavior: 'smooth'
              });
            }
          }
        }, 100);
      }
    }

    // 更新消息数量引用
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // 提交表单处理
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && sessionData?.user) {
      sendToAI(input);
      setInput('');
    }
  };

  // 初始化 - 加载历史消息或触发初始分析
  useEffect(() => {
    // 异步初始化聊天，使用立即执行的异步函数
    (async () => {
      if (firstMessageRef.current) {
        firstMessageRef.current = false;

        // 限流状态由后端错误回调设置，无需预检查

        // 初始化聊天，获取是否有历史消息
        const hasHistory = await initializeChat();

        // 如果没有历史消息，延迟300ms后发送初始分析请求
        if (!hasHistory) {
          const timer = setTimeout(() => {
            sendToAI('', true); // true表示初始分析
          }, 300);

          return () => clearTimeout(timer);
        }
      }
    })();
  }, []); // 仅在组件挂载时执行一次

  // 处理背景滚动（可关闭）
  useEffect(() => {
    if (lockBodyScroll) {
      document.body.style.overflow = 'hidden';
    }

    // 组件卸载时恢复背景滚动并清理资源
    return () => {
      if (lockBodyScroll) {
        document.body.style.overflow = '';
      }
      cleanup(); // 清理聊天资源
    };
  }, [lockBodyScroll]);

  // 设置mounted状态，用于确保客户端渲染
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 渲染消息内容
  const renderMessageContent = (content: string) => {
    if (!content) return '';
    return <AIContentRenderer content={content} />;
  };

  // 处理点击对话框外部区域关闭对话框
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 如果点击的是背景蒙层而不是对话框内部，则关闭对话框
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // 对话框内容
  const dialogContent = (
    <div
      className={`z-1003 ${renderInPlace ? 'absolute inset-0' : 'fixed inset-0'} bg-black/30 backdrop-blur-[3px] backdrop-saturate-180 grammar-analysis-dialog ${isMobile
        ? 'flex flex-col'
        : 'flex justify-center items-center'
        }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        className={`bg-white shadow-lg w-full ${isMobile
          ? 'h-full max-w-none rounded-none'
          : 'rounded-lg max-w-3xl h-[80vh] md:h-[80vh]'
          }`}
      >
        {/* 右上角关闭按钮（仅移动端显示） */}
        {isMobile && (
          <div className="top-3 right-3 z-1004 fixed">
            <button
              onClick={onClose}
              className="flex justify-center items-center shadow-lg border rounded-full focus:outline-none w-10 h-10 hover:scale-105 active:scale-95 transition-all duration-200"
              style={{
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
              aria-label={t('close')}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="#374151"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}

        <div className="flex flex-col h-full min-h-0">

          {/* 消息区域 */}
          <Card className="flex flex-col flex-1 border-none min-h-0">
            <CardContent ref={chatContainerRef} className="flex-1 px-4 py-4 min-h-0 overflow-y-auto">
              {isLoadingMessages
                ? <Loading />
                : (
                  <div className="space-y-4 font-[ui-sans-serif]">
                    {/* 内联限流提示：进入时或错误时显示 */}
                    {showLimit && (
                      <div className="flex justify-center">
                        <InlineLimitBanner fontSizePx={19} />
                      </div>
                    )}
                    {/* 在AI输出前展示上下文（若存在），样式与AI消息一致 */}
                    {(() => {
                      const ctx = getContextText();
                      if (!ctx) return null;
                      return (
                        <div className="flex justify-start">
                          <div className="flex flex-row w-full md:max-w-[80%]">
                            <div className="hidden md:block z-10 relative shrink-0 mr-3">
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
                            </div>
                            <div
                              className={`p-3 rounded-lg text-[18px] leading-[1.9] tracking-[0.5px] ${isMobile ? '' : 'flex-1 md:flex-initial'} md:ml-[-40px] md:pl-[52px]`}
                            >
                              {renderMessageContent(ctx)}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} w-full md:max-w-[80%]`}
                        >
                          <div className="hidden md:block z-10 relative shrink-0 mr-3">
                            {message.role === 'assistant' ? (
                              <div className="flex flex-col items-center">
                                {/* 当AI思考中且该条消息内容为空时，用呼吸的黑色小圆表示思考状态；加载中不展示标题 */}
                                {isLoading && !message.content ? (
                                  <div className="bg-black rounded-full w-[20px] h-[20px] animate-breathing-strong" />
                                ) : (
                                  <>
                                    <span className="-mt-[4px] font-sans text-[12px] text-center">Bunn</span>
                                    <Image
                                      src="/assets/logo.jpeg"
                                      alt="Bunn"
                                      width={32}
                                      height={32}
                                      className="rounded-[4px] w-[32px] h-[32px]"
                                    />
                                  </>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center h-full">
                                <Avatar className="w-10 h-10">
                                  <img src={sessionData?.user?.image?.toString()} alt="User" />
                                </Avatar>
                              </div>
                            )}
                          </div>
                          {/* 移动端AI消息特殊处理 */}
                          {isMobile && message.role === 'assistant' && isLoading && !message.content ? (
                            <div className="flex items-center">
                              <div className="bg-black rounded-full w-4 h-4 animate-breathing-strong" />
                            </div>
                          ) : (
                            <div
                              className={`p-3 rounded-lg text-[18px] leading-[1.9] tracking-[0.5px] ${isMobile ? '' : 'flex-1 md:flex-initial'} ${message.role === 'assistant' ? 'md:ml-[-40px] md:pl-[52px]' : ''}`}
                            >
                              {renderMessageContent(message.content)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* 移动端AI分析完成后的下一题提示 */}
                    {isMobile && !isLoading && messages.length > 0 && messages.some(msg => msg.role === 'assistant' && msg.content) && (
                      <div className="flex justify-center">
                        <button
                          onClick={() => {
                            if (onNext) {
                              onNext();
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2rounded-lg transition-colors cursor-pointer"
                        >
                          <span className="font-medium text-purple-600 animate-breathing">{t('nextQuestion')}</span>
                        </button>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
            </CardContent>

            {/* 输入区域 */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center space-x-2 p-4 border-t"
            >
              <div className="relative flex-1">
                <Input
                  value={input}
                  onChange={handleInputChange}
                  placeholder={!showLimit ? t('placeholder') : ''}
                  disabled={isLoading || isLoadingMessages || !sessionData?.user || showLimit}
                  className={`flex-1 ${(!sessionData?.user || showLimit) ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
                />
                {showLimit && (
                  <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                    <InlineLimitBanner fontSizePx={14} upgradeClassName="pointer-events-auto" />
                  </div>
                )}
              </div>
              <div
                className={`relative w-[32px] h-[32px] ${!isLoading && !isLoadingMessages && input.trim() && sessionData?.user && !showLimit ? "bg-black hover:bg-dark" : ""} rounded-[0.375rem] flex items-center justify-center ${(isLoading || isLoadingMessages || !sessionData?.user || showLimit) ? "pointer-events-none opacity-60" : ""}`}
                onClick={(e) => {
                  if (!isLoading && !isLoadingMessages && input.trim() && sessionData?.user && !showLimit) {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="w-4 h-4"
                  strokeWidth="2"
                >
                  <path
                    d="M.5 1.163A1 1 0 0 1 1.97.28l12.868 6.837a1 1 0 0 1 0 1.766L1.969 15.72A1 1 0 0 1 .5 14.836V10.33a1 1 0 0 1 .816-.983L8.5 8 1.316 6.653A1 1 0 0 1 .5 5.67V1.163Z"
                    fill={!isLoading && !isLoadingMessages && input.trim() && sessionData?.user && !showLimit ? "white" : "grey"}
                  ></path>
                </svg>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );

  // 使用 Portal 将对话框渲染到 body 元素（可关闭）
  if (!mounted) return null;

  return renderInPlace ? dialogContent : createPortal(dialogContent, document.body);
} 