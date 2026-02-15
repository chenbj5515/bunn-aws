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
        className="flex items-center gap-2 bg-white hover:bg-white disabled:opacity-50 shadow-neumorphic hover:shadow-neumorphic-button-hover px-3 py-1.5 rounded-full text-black text-sm transition-all duration-200 disabled:cursor-not-allowed"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>{t('quickButton')}</span>
      </button>

      {/* 输入框 */}
      <div className="relative flex items-center bg-white focus-within:shadow-sm border border-gray-200 focus-within:border-gray-300 rounded-xl transition-all duration-200">
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
          className="flex-1 bg-transparent px-4 py-3 outline-none text-[15px] disabled:cursor-not-allowed placeholder-gray-400"
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
