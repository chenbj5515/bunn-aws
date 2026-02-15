"use client";

import { useState, useRef, KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, Send } from 'lucide-react';

interface AskAIInputProps {
  onSendMessage: (message: string) => void;
  onGrammarAnalysis: () => void;
  disabled?: boolean;
}

/**
 * 问 AI 输入框组件
 * 包含快捷语法分析按钮和输入框
 */
export function AskAIInput({
  onSendMessage,
  onGrammarAnalysis,
  disabled = false,
}: AskAIInputProps) {
  const t = useTranslations('grammarAnalysis');
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false); // 日语输入法合成状态
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled && !isComposing) {
      onSendMessage(trimmed);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // 在 IME 合成期间，忽略 Enter 键
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasInput = input.trim().length > 0;

  return (
    <div className="space-y-3">
      {/* 快捷语法分析按钮 */}
      <button
        onClick={onGrammarAnalysis}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-white shadow-neumorphic hover:shadow-neumorphic-button-hover rounded-full text-sm text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>一键语法分析</span>
      </button>

      {/* 输入框 */}
      <div className="relative flex items-center bg-white rounded-xl border border-gray-200 focus-within:border-gray-300 focus-within:shadow-sm transition-all duration-200">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={t('placeholder')}
          disabled={disabled}
          className="flex-1 bg-transparent px-4 py-3 text-[15px] placeholder-gray-400 outline-none disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !hasInput || isComposing}
          className={`mr-2 p-2 rounded-lg transition-all duration-200 ${
            hasInput && !disabled && !isComposing
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
