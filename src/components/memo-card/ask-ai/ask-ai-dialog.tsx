"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import {
  currentAskAICardIdAtom,
  closeAskAIDialogAtom,
} from "@/app/[locale]/channels/[channelId]/_store";
import { useAskAIInit } from "./hooks";
import { AskAIMessageList, AskAIInputArea } from "./components";
import type { AskAIDialogProps } from "./types";

/**
 * 问 AI 对话弹窗组件
 *
 * 职责：
 * - 弹窗容器和动画
 * - 组合子组件
 * - Portal 渲染
 */
export function AskAIDialog({ memoCard }: AskAIDialogProps) {
  const cardId = useAtomValue(currentAskAICardIdAtom);
  const closeDialog = useSetAtom(closeAskAIDialogAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  // 记录 mousedown 是否发生在背景上
  const mouseDownOnBackdropRef = useRef(false);

  // 初始化（处理 pending action、禁止背景滚动等）
  useAskAIInit(memoCard);

  // 记录 mousedown 位置
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // 只有当 mousedown 发生在背景上（不在弹窗内）时才标记
    mouseDownOnBackdropRef.current = 
      containerRef.current !== null && !containerRef.current.contains(e.target as Node);
  };

  // 处理点击背景关闭 - 只有当 mousedown 和 click 都发生在背景上时才关闭
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const clickOnBackdrop = 
      containerRef.current !== null && !containerRef.current.contains(e.target as Node);
    
    if (mouseDownOnBackdropRef.current && clickOnBackdrop) {
      closeDialog();
    }
    // 重置状态
    mouseDownOnBackdropRef.current = false;
  };

  if (!cardId) return null;

  const dialogContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-1003 bg-black/30 backdrop-blur-[3px] flex justify-center items-center"
        onMouseDown={handleMouseDown}
        onClick={handleBackdropClick}
      >
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-white shadow-lg rounded-lg w-full max-w-3xl h-[80vh] flex flex-col"
        >
          <AskAIMessageList memoCard={memoCard} />
          <AskAIInputArea memoCard={memoCard} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(dialogContent, document.body);
}
