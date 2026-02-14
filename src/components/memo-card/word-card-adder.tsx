// import LoadingButton from "@/components/ui/loading-button";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { SuccessMotion } from "../success-motion";

// 添加毛玻璃效果的CSS
const frostedGlassStyle = `
  .frosted-glass {
    background-color: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(25px) saturate(180%);
    -webkit-backdrop-filter: blur(25px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    position: absolute;
  }
`;

// 自定义空格键图标组件
const SpaceKeyIcon = () => (
  <div className="flex justify-center items-center">
    <span className="text-xl" style={{ marginTop: '-10px', color: '#000000' }}>⎵</span>
  </div>
);

interface WordCardAdderProps {
    activeTooltip: {
        word: string;
        meaning: string;
        kanaPronunciation?: string;
        anchorRect: {
            top: number;
            left: number;
            right: number;
            bottom: number;
            width: number;
            height: number;
        };
    };
    isAddButtonActive: boolean;
    handleAddToDictionary: (word: string, meaning: string, kanaPronunciation?: string) => void;
    onAddSuccess?: () => void;
    theme?: 'default' | 'frosted'; // 控制悬浮窗样式，默认为白色背景，frosted为毛玻璃效果
}

export function WordCardAdder(props: WordCardAdderProps) {
    const t = useTranslations('memoCard');
    const { activeTooltip, isAddButtonActive, handleAddToDictionary, onAddSuccess, theme = 'default' } = props;
    
    // 添加样式到DOM，仅当主题为frosted时
    useEffect(() => {
        if (theme === 'frosted') {
            const styleElement = document.createElement('style');
            styleElement.innerHTML = frostedGlassStyle;
            document.head.appendChild(styleElement);
            
            return () => {
                document.head.removeChild(styleElement);
            };
        }
    }, [theme]);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number }>({
        width: 0,
        height: 0,
    });
    const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
        width: 0,
        height: 0,
    });

    // 当 activeTooltip 变化时重置组件状态并重新测量尺寸
    useEffect(() => {
        setIsLoading(false);
        setIsSuccess(false);

        // 更新视口尺寸
        const updateViewportSize = () => {
            if (typeof window !== "undefined") {
                setViewportSize({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
            }
        };

        updateViewportSize();

        window.addEventListener("resize", updateViewportSize);

        return () => {
            window.removeEventListener("resize", updateViewportSize);
        };
    }, [activeTooltip.word, activeTooltip.meaning]);

    // 测量 Tooltip 实际尺寸
    useEffect(() => {
        if (tooltipRef.current) {
            const rect = tooltipRef.current.getBoundingClientRect();
            setTooltipSize({
                width: rect.width,
                height: rect.height,
            });
        }
    }, [activeTooltip.word, activeTooltip.meaning]);

    // 根据锚点和 Tooltip 尺寸、视口尺寸计算最终位置
    const computedPosition = (() => {
        const anchor = activeTooltip.anchorRect;
        const viewportWidth = viewportSize.width || (typeof window !== "undefined" ? window.innerWidth : 0);
        const viewportHeight = viewportSize.height || (typeof window !== "undefined" ? window.innerHeight : 0);

        // 如果视口尺寸还未知，简单返回默认右下位置，避免闪烁
        if (!viewportWidth || !viewportHeight) {
            return {
                top: anchor.bottom + 8,
                left: anchor.right + 8,
            };
        }

        const MARGIN = 8;
        const OFFSET_X = 8;
        const OFFSET_Y = 8;

        const tooltipWidth = tooltipSize.width || 280;  // 与 min-width 接近
        const tooltipHeight = tooltipSize.height || 160; // 与 min-height 接近

        // 默认：右下方
        let top = anchor.bottom + OFFSET_Y;
        let left = anchor.right + OFFSET_X;

        // 水平方向防溢出：优先尝试放到左侧
        if (left + tooltipWidth > viewportWidth - MARGIN) {
            const leftSide = anchor.left - tooltipWidth - OFFSET_X;
            if (leftSide >= MARGIN) {
                left = leftSide;
            } else {
                // 实在放不下，就贴右边，至少不溢出
                left = Math.max(MARGIN, viewportWidth - tooltipWidth - MARGIN);
            }
        }

        // 垂直方向防溢出：优先尝试放到上方
        if (top + tooltipHeight > viewportHeight - MARGIN) {
            const above = anchor.top - tooltipHeight - OFFSET_Y;
            if (above >= MARGIN) {
                top = above;
            } else {
                // 实在放不下，就贴底部
                top = Math.max(MARGIN, viewportHeight - tooltipHeight - MARGIN);
            }
        }

        return { top, left };
    })();

    // 处理添加成功
    const handleAddSuccess = () => {
        setIsLoading(false);
        setIsSuccess(true);

        // 成功状态展示1.5秒后恢复初始状态
        setTimeout(() => {
            setIsSuccess(false);
            if (onAddSuccess) onAddSuccess();
        }, 1500);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation(); // 阻止事件冒泡，避免触发全局视频控制
                setIsSpacePressed(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setIsSpacePressed(false);
                // 空格键松开时执行添加操作
                setIsLoading(true);
                try {
                    handleAddToDictionary(activeTooltip.word, activeTooltip.meaning, activeTooltip.kanaPronunciation);
                    handleAddSuccess();
                } catch (error) {
                    setIsLoading(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [activeTooltip.word, activeTooltip.meaning, handleAddToDictionary]);

    const handleClick = () => {
        setIsLoading(true);
        try {
            handleAddToDictionary(activeTooltip.word, activeTooltip.meaning, activeTooltip.kanaPronunciation);
            handleAddSuccess();
        } catch (error) {
            setIsLoading(false);
        }
    };

    const tooltipElement = (
        <div
            ref={tooltipRef}
            className={`z-9999 flex flex-col p-4 rounded-xl min-w-[280px] min-h-[160px] ${theme === 'frosted' ? 'frosted-glass text-black' : 'bg-white text-gray-800'}`}
            data-ruby-tooltip="true"
            style={{
                top: `${computedPosition.top}px`,
                left: `${computedPosition.left}px`,
                maxWidth: '90%',
                transformOrigin: 'top left',
                animation: 'fadeIn 0.15s ease-out',
                ...(theme === 'frosted' ? {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    willChange: 'backdrop-filter',
                } : {
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                }),
                position: 'fixed',
                isolation: 'isolate'
            }}
        >
            {/* 上半部分：meaning居中显示 */}
            <div className="flex flex-1 justify-center items-center mb-4">
                <div className={`px-2 font-medium text-lg text-center ${theme === 'frosted' ? 'text-black' : 'text-gray-800'}`}>{activeTooltip.meaning}</div>
            </div>

            {/* 下半部分：添加按钮 */}
            <div className="flex justify-center items-center w-full">
                <button
                    className={`w-[240px] rounded-lg p-2 text-sm transition-all duration-200 h-10
                        ${theme === 'frosted'
                            ? `${isAddButtonActive || isSpacePressed ? 'bg-white/30' : 'bg-white/20'} text-white`
                            : `${isAddButtonActive || isSpacePressed ? 'shadow-neumorphic-button-hover' : 'shadow-neumorphic'} text-white`
                        }
                        ${isLoading ? 'opacity-70 cursor-not-allowed' : theme === 'frosted' ? 'hover:bg-white/30 cursor-pointer' : 'hover:shadow-neumorphic-button-hover cursor-pointer'}`}
                    style={theme === 'frosted' ? {
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    } : {}}
                    onClick={handleClick}
                    disabled={isLoading || isSuccess}
                >
                    <div className="flex justify-center items-center w-full h-full">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center">
                                {
                                    isLoading ? (
                                        <Loader2 className={`w-4 h-4 ${theme === 'frosted' ? 'text-black' : 'text-black'} animate-spin`} />
                                    ) : isSuccess ? (
                                        <SuccessMotion />
                                    ) : (
                                        <SpaceKeyIcon />
                                    )
                                }
                            </div>
                            <span className={`font-sans text-[14px] ${theme === 'frosted' ? 'text-black' : 'text-black'} whitespace-nowrap`}>
                                {t('addToDictionary')}
                            </span>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );

    // 使用 Portal 将悬浮窗口渲染到 document.body，避免被容器裁剪
    return createPortal(tooltipElement, document.body);
}