"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/auth-client";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import InlineLimitBanner from "@/components/ui/inline-limit-banner";
import { currentAskAIStateAtom } from "@/app/[locale]/channels/[channelId]/_store";
import {
  askAIInputAtom,
  askAIIsComposingAtom,
  askAIShowLimitAtom,
  canSubmitAtom,
} from "../atoms";
import { useSendToAI } from "../hooks";
import type { MemoCardData } from "../types";

interface AskAIInputAreaProps {
  memoCard: MemoCardData;
}

/**
 * 输入区域组件
 */
export function AskAIInputArea({ memoCard }: AskAIInputAreaProps) {
  const t = useTranslations("grammarAnalysis");
  const { data: sessionData } = useSession();

  const [input, setInput] = useAtom(askAIInputAtom);
  const setIsComposing = useSetAtom(askAIIsComposingAtom);
  const showLimit = useAtomValue(askAIShowLimitAtom);
  const canSubmit = useAtomValue(canSubmitAtom);
  const askAIState = useAtomValue(currentAskAIStateAtom);

  const { sendToAI } = useSendToAI(memoCard);

  const isLoading = askAIState?.isLoading || false;
  const isLoadingHistory = askAIState?.isLoadingHistory || false;
  // 限流状态由后端响应决定（showLimit 在收到 TOKEN_LIMIT_EXCEEDED 错误时设为 true）
  const isDisabled = isLoading || isLoadingHistory || !sessionData?.user || showLimit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !sessionData?.user || showLimit) return;

    const userInput = input.trim();
    setInput("");
    sendToAI(userInput, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 在 IME 合成期间，忽略 Enter 键
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit && sessionData?.user && !showLimit) {
        const userInput = input.trim();
        setInput("");
        sendToAI(userInput, false);
      }
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center space-x-2 p-4"
    >
      <div className="relative flex-1">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={!showLimit ? t("placeholder") : ""}
          disabled={isDisabled}
          className={`flex-1 h-10 bg-white border-gray-200 focus:border-gray-300 focus:shadow-sm focus:ring-0 transition-all duration-200 ${
            !sessionData?.user || showLimit
              ? "opacity-60 cursor-not-allowed bg-gray-100"
              : ""
          }`}
        />
        {showLimit && (
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
            <InlineLimitBanner
              fontSizePx={14}
              upgradeClassName="pointer-events-auto"
            />
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={!canSubmit || !sessionData?.user || showLimit}
        className={`w-10 h-10 flex items-center justify-center rounded-md transition-all ${
          canSubmit && sessionData?.user && !showLimit
            ? "bg-black text-white hover:bg-gray-800"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
