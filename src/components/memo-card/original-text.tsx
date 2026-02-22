"use client"
import React, { useRef, useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { updateOriginalText } from "./server-functions";
import { Character } from "./types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslations, useLocale } from 'next-intl';
import { speakTextWithMinimax } from "@/lib/tts/client";
import { insertWordCard } from "./server-functions/insert-word-card";
import { WordCardAdder } from "./word-card-adder";
import { X, Loader2 } from "lucide-react";
import { removeMemoCardCharacter } from "./server-functions/remove-character";
import Image from "next/image";

// 全局 Tooltip 状态，保证全局只存在一个单词卡片
type TooltipAnchorRect = {
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
};

type GlobalTooltipState = {
    ownerId: number;
    word: string;
    meaning: string;
    kanaPronunciation?: string;
    anchorRect: TooltipAnchorRect;
} | null;

let globalTooltipState: GlobalTooltipState = null;
const tooltipSubscribers = new Set<(state: GlobalTooltipState) => void>();
let tooltipOwnerIdCounter = 0;

function setGlobalTooltipState(state: GlobalTooltipState) {
    globalTooltipState = state;
    tooltipSubscribers.forEach((listener) => listener(globalTooltipState));
}

function subscribeTooltip(listener: (state: GlobalTooltipState) => void) {
    tooltipSubscribers.add(listener);
    // 初始化时同步当前全局状态
    listener(globalTooltipState);
    return () => {
        tooltipSubscribers.delete(listener);
    };
}

// 防抖函数
const debounce = <F extends (...args: any[]) => any>(func: F, wait: number) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<F>) => {
        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
};

import type { WordSegmentationV2, Segment } from "@/types/extended-memo-card";

interface OriginalTextProps {
    selectedCharacter?: Character | null;
    isFocused?: boolean;
    originalTextRef?: React.MutableRefObject<HTMLDivElement | null>;
    wordSegmentation?: WordSegmentationV2 | null;
    id?: string;
    onOpenCharacterDialog?: () => void;
    onRemoveCharacter?: () => void;
    isInChannelsOrTimeline?: boolean;
    noOffset?: boolean;
    tooltipTheme?: 'default' | 'frosted';
    hideUnderline?: boolean;
    hoverUnderlineOnHover?: boolean;
    className?: string;
    originalText?: string;
}

export function OriginalText({
    selectedCharacter,
    isFocused = false,
    originalTextRef,
    wordSegmentation,
    id,
    onOpenCharacterDialog,
    onRemoveCharacter,
    isInChannelsOrTimeline = true,
    noOffset = false,
    tooltipTheme = 'default',
    hideUnderline = false,
    hoverUnderlineOnHover = false,
    className,
    originalText,
}: OriginalTextProps) {
    const t = useTranslations('memoCard');
    const locale = useLocale();
    const pathname = usePathname();
    const localOriginalTextRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 使用传入的 ref 或本地创建的 ref
    const effectiveRef = originalTextRef || localOriginalTextRef;

    // 根据当前语言获取 segment 的翻译
    const getSegmentTranslation = (segment: Segment): string => {
        if (!segment.translations) return '';
        
        const translations = segment.translations;
        // 对于 zh-TW，如果没有专门的翻译，使用 zh 的翻译
        if (locale === 'zh-TW' && !translations['zh-TW']) {
            return translations['zh'] || translations['en'] || '';
        }
        return translations[locale as keyof typeof translations] || translations['en'] || '';
    };

    // Tooltip 相关状态
    const [activeTooltip, setActiveTooltip] = useState<{
        word: string;
        meaning: string;
        kanaPronunciation?: string;
        anchorRect: TooltipAnchorRect;
    } | null>(null);
    // 为每个组件实例分配唯一 ID，用于全局单例控制
    const instanceIdRef = useRef<number | null>(null);
    if (instanceIdRef.current === null) {
        tooltipOwnerIdCounter += 1;
        instanceIdRef.current = tooltipOwnerIdCounter;
    }
    const instanceId = instanceIdRef.current;
    // 添加角色头像悬停状态
    const [isHoveringCharacter, setIsHoveringCharacter] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    // 订阅全局 Tooltip 状态，确保任意时刻只会有一个组件实例处于激活状态
    useEffect(() => {
        const unsubscribe = subscribeTooltip((state) => {
            if (state && state.ownerId === instanceId) {
                setActiveTooltip({
                    word: state.word,
                    meaning: state.meaning,
                    kanaPronunciation: state.kanaPronunciation,
                    anchorRect: state.anchorRect,
                });
            } else {
                setActiveTooltip(null);
            }
        });
        return unsubscribe;
    }, [instanceId]);

    function handleOriginalTextBlur() {
        if (effectiveRef.current?.textContent && !pathname.includes('/home') && !pathname.includes('/guide') && id) {
            updateOriginalText(id, effectiveRef.current?.textContent?.slice(3));
        }
    }

    // 处理Ruby元素点击，播放发音
    const handleRubyClick = async (text: string) => {
        if (!isPlaying) {
            try {
                setIsPlaying(true);
                await speakTextWithMinimax(text);
            } finally {
                setIsPlaying(false);
            }
        }
    };

    // 显示单词tooltip
    const showTooltip = (segment: Segment, event: React.MouseEvent) => {
        const element = event.currentTarget as HTMLElement;
        const rect = element.getBoundingClientRect();
        const meaning = getSegmentTranslation(segment);

        // 直接使用相对于视口的锚点信息，后续由 Tooltip 自己做防溢出布局
        setGlobalTooltipState({
            ownerId: instanceId as number,
            word: segment.word,
            meaning,
            kanaPronunciation: segment.ruby || undefined,
            anchorRect: {
                top: rect.top,
                left: rect.left,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height,
            },
        });
    };

    // 添加单词到单词本
    const handleAddToDictionary = async (word: string, meaning: string, kanaPronunciation?: string) => {
        try {
            if (!pathname.includes('/home') && !pathname.includes('/guide') && id) {
                const result = await insertWordCard(word, meaning, id, kanaPronunciation);
                if (result instanceof Error) {
                    throw result;
                }
            }
        } catch (error) {
            console.error('添加单词失败', error);
        } finally {
            // 无论成功失败都关闭tooltip
            setGlobalTooltipState(null);
        }
    };

    // 监听鼠标移动事件，当鼠标不在tooltip或Ruby元素上时关闭tooltip
    useEffect(() => {
        const checkMousePosition = (event: MouseEvent) => {
            if (activeTooltip) {
                const tooltipElement = document.querySelector('[data-ruby-tooltip="true"]');
                const targetElement = document.elementFromPoint(event.clientX, event.clientY);

                if (!targetElement) return;

                // 检查鼠标是否在tooltip内
                let isOverTooltip = tooltipElement?.contains(targetElement);

                // 检查鼠标是否在任何Ruby元素上
                let isOverRuby = false;
                const rubyElements = document.querySelectorAll('ruby');

                rubyElements.forEach(ruby => {
                    if (ruby.contains(targetElement)) {
                        isOverRuby = true;
                    }
                });

                // 如果鼠标既不在tooltip上也不在任何ruby元素上，则关闭tooltip
                if (!isOverTooltip && !isOverRuby) {
                    setGlobalTooltipState(null);
                }
            }
        };

        // 使用防抖函数包装事件处理程序，30ms 的延迟可以提高性能
        const debouncedCheckMousePosition = debounce(checkMousePosition, 30);

        document.addEventListener('mousemove', debouncedCheckMousePosition);
        return () => {
            document.removeEventListener('mousemove', debouncedCheckMousePosition);
        };
    }, [activeTooltip]);

    // 处理解除角色绑定
    const handleRemoveCharacter = async (e: React.MouseEvent) => {
        e.stopPropagation(); // 阻止事件冒泡，避免触发点击角色头像的事件
        
        if (id) {
            try {
                // 调用server function解除绑定
                const result = await removeMemoCardCharacter(id);
                
                if (result.success) {
                    // 调用父组件传入的回调函数更新本地状态
                    if (onRemoveCharacter) {
                        onRemoveCharacter();
                    }
                } else {
                }
            } catch (error) {
                console.error('解除角色绑定失败:', error);
            }
        }
    };

    // 渲染原始文本标签或角色头像
    const renderOriginalTextLabel = () => {
        if (selectedCharacter) {
            return (
                <div
                    className={`inline-flex relative items-center ${isInChannelsOrTimeline ? 'cursor-pointer' : ''}`}
                    onClick={isInChannelsOrTimeline ? onOpenCharacterDialog : undefined}
                >
                    <span className="flex flex-col">
                        <div 
                            className="relative"
                            onMouseEnter={() => {
                                setIsHoveringCharacter(true);
                            }}
                            onMouseLeave={() => {
                                setIsHoveringCharacter(false);
                            }}
                            style={{ padding: '2px' }}
                        >
                            <img
                                src={selectedCharacter.avatarUrl || '/images/youtube.png'}
                                alt={selectedCharacter.name}
                                className="inline-block mr-1 rounded-full w-10 h-10 object-cover"
                                onError={(e) => {
                                    // 图片加载失败时使用占位图
                                    (e.target as HTMLImageElement).src = '/images/youtube.png';
                                }}
                            />：
                            <span className="-top-5 left-[33%] absolute text-gray-600 text-xs text-center whitespace-nowrap -translate-x-1/2">
                                {selectedCharacter.name}
                            </span>
                            
                            {/* 删除图标仅在悬停时且在允许的路由下显示 */}
                            {isHoveringCharacter && isInChannelsOrTimeline && (
                                <button 
                                    className="top-0 right-[10px] z-1000 absolute bg-white/80 hover:bg-white shadow-sm p-1 rounded-full text-gray-500 hover:text-red-500 transition-colors"
                                    onClick={handleRemoveCharacter}
                                    title={t('removeCharacter')}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </span>
                </div>
            );
        } else {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className="inline-flex relative items-center cursor-pointer"
                            onClick={onOpenCharacterDialog}
                        >
                            {/* <span className="inline-block whitespace-nowrap">{t('originalText')}</span> */}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <span>{t('useCharacterAvatar')}</span>
                    </TooltipContent>
                </Tooltip>
            );
        }
    };

    // 渲染单个 segment
    const renderSegment = (segment: Segment, index: number) => {
        const hasRuby = !!segment.ruby;
        const hasTranslation = !!segment.translations;
        const translation = getSegmentTranslation(segment);

        if (hasRuby) {
            const rubyClassName = [
                'relative z-999 cursor-pointer',
                hasTranslation ? 'has-translation' : '',
            ]
                .filter(Boolean)
                .join(' ');

            return (
                <ruby
                    key={index}
                    onClick={() => handleRubyClick(segment.ruby || segment.word)}
                    onMouseEnter={hasTranslation ? (e) => showTooltip(segment, e) : undefined}
                    className={rubyClassName}
                >
                    {segment.word}
                    <rt>{segment.ruby}</rt>
                </ruby>
            );
        }

        return <React.Fragment key={index}>{segment.word}</React.Fragment>;
    };

    // 渲染所有 segments
    const renderSegments = (segments: Segment[]) => {
        return (
            <span>
                {renderOriginalTextLabel()}
                {segments.map((segment, index) => renderSegment(segment, index))}
            </span>
        );
    };

    // 使用useMemo缓存渲染结果
    const memoizedRenderedContent = useMemo(() => {
        if (wordSegmentation?.segments) {
            return renderSegments(wordSegmentation.segments);
        }
        // 如果没有 wordSegmentation，显示原始文本
        return (
            <span>
                {renderOriginalTextLabel()}
                {originalText || ''}
            </span>
        );
    }, [selectedCharacter, isHoveringCharacter, wordSegmentation, originalText]);

    return (
        <div ref={containerRef} className={`relative ${noOffset ? 'w-full' : 'w-[calc(100%-42px)]'}`}>
            <div
                suppressContentEditableWarning
                // contentEditable
                className={`relative flex items-center outline-none ${selectedCharacter ? "items-center" : "items-baseline"} ${className || ''}`}
                onBlur={handleOriginalTextBlur}
                ref={effectiveRef}
            >
                {isFocused ? (
                    <section
                        className={`z-1000 rounded-lg absolute ${isFocused ? "backdrop-blur-[3px] backdrop-saturate-180" : ""
                            }  w-[101%] h-[105%] -left-[4px] -top-[2px]`}
                    ></section>
                ) : null}
                {memoizedRenderedContent}
            </div>

            {/* 单词Tooltip */}
            {activeTooltip && (
                <WordCardAdder
                    activeTooltip={activeTooltip}
                    isAddButtonActive={false}
                    handleAddToDictionary={handleAddToDictionary}
                    theme={tooltipTheme}
                />
            )}
        </div>
    )
}