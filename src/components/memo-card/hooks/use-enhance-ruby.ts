"use client"
import React from "react";
import { speakTextWithMinimax } from "@/lib/tts/client";
import { insertWordCard } from "../server-functions/insert-word-card";
import { usePathname } from "next/navigation";

interface UseEnhanceRubyProps {
  originalTextRef: { current: HTMLDivElement | null };
  rubyTranslationRecord: Record<string, string>;
  id: string;
}

export function useEnhanceRuby({ 
  originalTextRef, 
  rubyTranslationRecord, 
  id 
}: UseEnhanceRubyProps) {
  const pathname = usePathname();
  // 跟踪当前显示的tooltip信息
  const activeTooltipRef = React.useRef<{word: string; meaning: string} | null>(null);
  // 跟踪当前活动的Ruby元素和其对应的弹窗
  const activeRubyRef = React.useRef<HTMLElement | null>(null);
  const activeTooltipElementRef = React.useRef<HTMLElement | null>(null);
  // 添加标志，表示弹窗是否正在创建中
  const isCreatingTooltipRef = React.useRef<boolean>(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const clickHandlersRef = React.useRef<Map<string, (event: Event) => void>>(new Map());

  // 播放Ruby元素的发音
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

  // 添加单词到单词本
  const handleAddToDictionary = async (word: string, meaning: string) => {
    try {
      const result = await insertWordCard(word, meaning, id);
      if (result instanceof Error) {
        throw result;
      }
      // 使用简单的alert替代toast
    } catch (error) {
      console.error('添加单词失败', error);
    }
  };

  // 移除所有弹窗的辅助函数
  const removeAllTooltips = () => {
    document.querySelectorAll('.ruby-tooltip-popup').forEach(tip => tip.remove());
    activeTooltipRef.current = null;
    activeRubyRef.current = null;
    activeTooltipElementRef.current = null;
  };

  // 判断鼠标是否在元素内
  const isMouseInElement = (element: HTMLElement | null, mouseX: number, mouseY: number): boolean => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return (
      mouseX >= rect.left && 
      mouseX <= rect.right && 
      mouseY >= rect.top && 
      mouseY <= rect.bottom
    );
  };

  // 检查鼠标是否在Ruby元素或其子元素（包括rt）内
  const isMouseInRubyOrChildren = (ruby: HTMLElement | null, mouseX: number, mouseY: number): boolean => {
    if (!ruby) return false;
    
    // 检查整个ruby元素
    if (isMouseInElement(ruby, mouseX, mouseY)) return true;
    
    // 检查rt元素
    const rtElement = ruby.querySelector('rt');
    if (rtElement && isMouseInElement(rtElement as HTMLElement, mouseX, mouseY)) return true;
    
    return false;
  };

  // 添加全局鼠标移动监听，控制弹窗显示/隐藏
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMouseMove = (e: MouseEvent) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // 如果没有活动的tooltip或者正在创建tooltip，不需要处理
      if (!activeTooltipRef.current || isCreatingTooltipRef.current) return;
      
      // 使用增强的函数检查鼠标是否在Ruby元素或其子元素内
      const isInRuby = isMouseInRubyOrChildren(activeRubyRef.current, mouseX, mouseY);
      const isInTooltip = isMouseInElement(activeTooltipElementRef.current, mouseX, mouseY);
      
      // 只有当鼠标既不在Ruby元素内也不在弹窗内时，才关闭弹窗
      if (!isInRuby && !isInTooltip) {
        removeAllTooltips();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // 添加空格键快捷添加单词功能
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 当按下空格键且有tooltip显示时
      if (e.code === 'Space' && activeTooltipRef.current) {
        e.preventDefault(); // 防止页面滚动
        e.stopPropagation(); // 阻止事件冒泡到全局，避免触发视频控制
        
        // 添加按钮按下效果 - 只选择当前活动的tooltip中的按钮
        const activeTooltip = document.querySelector('.ruby-tooltip-popup');
        if (activeTooltip) {
          const addButton = activeTooltip.querySelector('.add-to-dictionary-btn');
          if (addButton) {
            addButton.classList.add('btn-active');
          }
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && activeTooltipRef.current) {
        e.preventDefault();
        e.stopPropagation();
        const { word, meaning } = activeTooltipRef.current;
        
        // 移除按钮按下效果 - 只选择当前活动的tooltip中的按钮
        const activeTooltip = document.querySelector('.ruby-tooltip-popup');
        if (activeTooltip) {
          const addButton = activeTooltip.querySelector('.add-to-dictionary-btn');
          if (addButton) {
            addButton.classList.remove('btn-active');
          }
        }
        
        handleAddToDictionary(word, meaning);
        
        // 使用我们的辅助函数移除所有tooltip
        removeAllTooltips();
      }
    };

    // 添加全局键盘事件监听器
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 清理函数
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [id]);

  // 增强Ruby元素，添加悬停显示翻译弹窗功能
  React.useEffect(() => {
    if (!originalTextRef.current) return;

    const rubyElements = originalTextRef.current.querySelectorAll('ruby');
    
    // 创建单一的点击事件处理函数
    const handleClick = (event: Event) => {
      const rubyElement = event.currentTarget as HTMLElement;
      const rtElement = rubyElement.querySelector('rt');
      if (rtElement) {
        const rubyText = rtElement.textContent || '';
        handleRubyClick(rubyText);
      }
    };

    rubyElements.forEach(ruby => {
      ruby.style.cursor = 'pointer';

      // 移除所有现有事件监听器，使用克隆节点替换的方式
      const newRuby = ruby.cloneNode(true);
      if (ruby.parentNode) {
        ruby.parentNode.replaceChild(newRuby, ruby);
        ruby = newRuby as HTMLElement;
      }
      
      // 重新添加唯一的点击事件监听器
      ruby.addEventListener('click', handleClick);

      // 获取原文本
      const textNode = ruby.childNodes[0];
      const originalWord = textNode ? textNode.textContent || '' : '';

      // 如果有翻译，添加悬停提示
      if (originalWord && rubyTranslationRecord[originalWord]) {
        // 确保originalWord不为undefined（添加类型安全检查）
        const word = originalWord;
        const meaning = rubyTranslationRecord[originalWord] || '';

        // 添加数据属性
        ruby.setAttribute('data-word', word);
        ruby.setAttribute('data-meaning', meaning);
        ruby.classList.add('ruby-word-tooltip');

        // 移除旧的悬停事件
        ruby.onmouseenter = null;
        ruby.onmouseleave = null;

        // 创建一个显示弹窗的函数，可以被ruby和rt元素共用
        const showTooltip = () => {
          // 设置正在创建弹窗标志
          isCreatingTooltipRef.current = true;
          
          // 检查当前已有弹窗是否显示的是相同单词
          if (activeTooltipRef.current && activeTooltipRef.current.word === word) {
            // 如果是相同单词，只需更新引用，不重新创建弹窗
            activeRubyRef.current = ruby as HTMLElement;
            // 短延迟后重置创建标志
            setTimeout(() => {
              isCreatingTooltipRef.current = false;
            }, 50);
            return;
          }
          
          // 不是相同单词，移除所有现有弹窗
          removeAllTooltips();

          // 设置当前活动的Ruby元素，确保我们引用的是整个ruby标签
          activeRubyRef.current = ruby as HTMLElement;
          
          // 更新当前活动的tooltip信息
          activeTooltipRef.current = { word, meaning };

          const tooltip = document.createElement('div');
          tooltip.className = 'ruby-tooltip-popup';
          tooltip.innerHTML = `
            <div class="tooltip-content">
              <div class="word-info">
                <div class="word-title">語句: ${word}</div>
                <div class="word-meaning">意味: ${meaning}</div>
              </div>
              <button class="add-to-dictionary-btn">
                <div class="add-to-dictionary-btn-content">
                  <span class="space-icon">⎵</span>
                  <span class="add-text">单語帳に追加</span>
                </div>
              </button>
            </div>
          `;

          // 计算位置
          const rubyRect = ruby.getBoundingClientRect();
          tooltip.style.position = 'absolute';
          tooltip.style.top = `${rubyRect.bottom + window.scrollY}px`;
          tooltip.style.left = `${rubyRect.left + window.scrollX}px`;

          // 添加到DOM
          document.body.appendChild(tooltip);
          
          // 保存当前活动的弹窗元素引用
          activeTooltipElementRef.current = tooltip as HTMLElement;

          // 添加按钮点击事件
          const addButton = tooltip.querySelector('.add-to-dictionary-btn');
          if (addButton) {
            addButton.addEventListener('click', () => {
              handleAddToDictionary(word, meaning);
              removeAllTooltips();
            });
          }
          
          // 短延迟后重置创建标志，确保DOM操作完成
          setTimeout(() => {
            isCreatingTooltipRef.current = false;
          }, 50);
        };

        // 添加悬停事件
        ruby.onmouseenter = showTooltip;
        
        // 显式设置onmouseleave为null，确保不会意外关闭弹窗
        ruby.onmouseleave = null;
        
        // 给rt元素也添加mouseenter事件，确保鼠标进入rt元素也会触发弹窗
        const rtElement = ruby.querySelector('rt');
        if (rtElement) {
          rtElement.addEventListener('mouseenter', showTooltip);
          // 设置鼠标样式
          (rtElement as HTMLElement).style.cursor = 'pointer';
        }
      }
    });

    // 清理函数，移除事件监听器
    return () => {
      // rubyElements.forEach(ruby => {
      //   // 使用保存的引用移除事件监听器
      //   ruby.removeEventListener('click', handleClick);
      //   ruby.onmouseenter = null;
      //   ruby.onmouseleave = null;
        
      //   // 也要移除rt元素的事件监听器
      //   const rtElement = ruby.querySelector('rt');
      //   if (rtElement) {
      //     // 这里使用空函数会导致移除失败，因为不是同一个函数引用
      //     // 我们应该在外部存储showTooltip函数引用或直接不移除（因为整个ruby元素会被清理）
      //     // 这里简化处理，因为页面会重新渲染，清理整个DOM，所以不需要精确移除每个事件
      //     // 如果想更精确地处理，可以使用WeakMap存储每个ruby元素对应的showTooltip函数
      //     // rtElement.removeEventListener('mouseenter', () => {});
      //   }
      // });
      // // 移除所有弹窗
      // removeAllTooltips();
    };
  }, []);

  // 样式：定义Ruby元素的悬停提示样式
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // 添加CSS样式
    const styleId = 'ruby-tooltip-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        ruby.ruby-word-tooltip {
            position: relative;
            border-bottom: 1px dotted #888;
            z-index: 999;
        }
        
        .ruby-tooltip-popup {
            z-index: 1000;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            padding: 12px;
            min-width: 200px;
            animation: fadeIn 0.15s ease-out;
            border-top: 2px solid #f0f0f0;
        }
        
        .ruby-tooltip-popup .tooltip-content {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .add-to-dictionary-btn-content {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
        }
        
        .ruby-tooltip-popup .word-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .ruby-tooltip-popup .add-to-dictionary-btn {
            width: 100%;
            background: white;
            border: 1px solid #ddd;
            box-shadow: 2px 2px 4px #bebebe, -4px -4px 8px #ffffff;
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            height: 36px;
            position: relative;
        }
        
        .ruby-tooltip-popup .space-icon {
            position: absolute;
            left: 16%;
            top: 25%;
            transform: translateY(-50%);
            color: #606060;
            font-size: 20px;
        }
        
        .ruby-tooltip-popup .add-text {
            position: absolute;
            right: 13%; 
            top: 50%;
            transform: translateY(-50%);
        }
        
        .ruby-tooltip-popup .add-to-dictionary-btn:hover,
        .ruby-tooltip-popup .add-to-dictionary-btn.btn-active {
            box-shadow: inset 2px 2px 4px #bebebe, inset -4px -4px 8px #ffffff;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, []);

  // 为每个Ruby元素添加点击事件和loading状态
  const enhanceRuby = () => {
    if (!originalTextRef.current) return;

    const rubyElements = originalTextRef.current.querySelectorAll('ruby');
    rubyElements.forEach((ruby) => {
      ruby.style.cursor = 'pointer';
      ruby.classList.add('relative');

      // 移除旧的事件监听器
      const oldHandlerId = ruby.getAttribute('data-click-handler');
      if (oldHandlerId) {
        const oldHandler = clickHandlersRef.current.get(oldHandlerId);
        if (oldHandler) {
          ruby.removeEventListener('click', oldHandler);
          clickHandlersRef.current.delete(oldHandlerId);
        }
      }

      // 添加新的事件监听器
      const clickHandler = async () => {
        const text = ruby.querySelector('rb')?.textContent || ruby.textContent;
        if (text) {
          await handleRubyClick(text);
        }
      };

      // 存储事件处理器引用
      const handlerId = Math.random().toString(36).substr(2, 9);
      clickHandlersRef.current.set(handlerId, clickHandler);
      ruby.setAttribute('data-click-handler', handlerId);

      ruby.addEventListener('click', clickHandler);

      // 添加loading状态指示器
      let loadingIndicator = ruby.querySelector('.ruby-loading-indicator');
      if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'ruby-loading-indicator absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden';
        loadingIndicator.innerHTML = '<div class="w-3 h-3 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>';
        ruby.appendChild(loadingIndicator);
      }

      // 根据播放状态显示/隐藏loading指示器
      const updateLoadingState = () => {
        if (loadingIndicator) {
          loadingIndicator.classList.toggle('hidden', !isPlaying);
        }
      };

      // 监听播放状态变化
      updateLoadingState();
      ruby.setAttribute('data-is-playing', isPlaying.toString());
    });
  };

  // 当播放状态改变时更新UI
  React.useEffect(() => {
    enhanceRuby();
  }, [enhanceRuby, isPlaying]);

  // 清理事件监听器
  React.useEffect(() => {
    return () => {
      if (originalTextRef.current) {
        const rubyElements = originalTextRef.current.querySelectorAll('ruby');
        rubyElements.forEach((ruby) => {
          const handlerId = ruby.getAttribute('data-click-handler');
          if (handlerId) {
            const handler = clickHandlersRef.current.get(handlerId);
            if (handler) {
              ruby.removeEventListener('click', handler);
            }
          }
        });
      }
      clickHandlersRef.current.clear();
    };
  }, []);

  return { handleRubyClick, handleAddToDictionary };
}
