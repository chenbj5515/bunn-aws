'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import {
  captureStateAtom,
  showCaptureDialogAtom,
  closeCaptureAtom,
  CaptureStage,
} from '../../_store';
import SubtitleRecognizeView from './subtitle-recognize-view';
import CompletedView from './completed-view';
import ErrorView from './error-view';
import RateLimitedView from './rate-limited-view';

/**
 * 截屏对话框主组件
 * 
 * 职责：根据 captureStateAtom 状态分发渲染对应子组件
 * 
 * 文档：./README.md
 */
export default function CaptureDialog() {
  const { stage } = useAtomValue(captureStateAtom);
  const showDialog = useAtomValue(showCaptureDialogAtom);
  const closeCapture = useSetAtom(closeCaptureAtom);

  if (!showDialog) return null;

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key="capture-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="z-9999 fixed inset-0 flex flex-col justify-start items-center bg-black/40 backdrop-blur-xl pt-[184px]"
      >
        {/* 关闭按钮 */}
        <button
          onClick={() => closeCapture()}
          className="top-8 right-8 absolute flex justify-center items-center hover:bg-white/10 rounded-full w-12 h-12 text-white/80 hover:text-white transition-all duration-300"
        >
          <X className="w-6 h-6" />
        </button>

        {/* 内容容器 */}
        <div className="flex flex-col items-center px-6 max-w-2xl">
          <AnimatePresence mode="wait">
            {(stage === CaptureStage.Extracting || stage === CaptureStage.SubtitleReady || stage === CaptureStage.CreatingCard) && (
              <SubtitleRecognizeView />
            )}

            {stage === CaptureStage.Completed && <CompletedView />}

            {stage === CaptureStage.Error && <ErrorView />}

            {stage === CaptureStage.RateLimited && <RateLimitedView />}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
