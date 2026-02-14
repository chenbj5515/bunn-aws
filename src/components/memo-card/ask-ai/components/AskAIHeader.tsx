"use client";

import { X } from "lucide-react";

interface AskAIHeaderProps {
  onClose: () => void;
}

/**
 * 对话弹窗头部 - 关闭按钮
 */
export function AskAIHeader({ onClose }: AskAIHeaderProps) {
  return (
    <div className="flex justify-end px-4 py-2">
      <button
        onClick={onClose}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <X className="w-5 h-5 text-gray-500" />
      </button>
    </div>
  );
}
