'use client';

import { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  store,
  captureStateAtom,
  createMemoCardAtom,
  updateSubtitleTextAtom,
  currentVideoIdAtom,
  currentVideoTitleAtom,
  currentVideoUrlAtom,
  channelDetailAtom,
  videoPlayerRefAtom,
  CaptureStage,
} from '../../_store';
import { FadeItem } from './fade-item';

/**
 * 字幕识别视图
 *
 * 职责：展示截图 + 根据状态显示 loading 或识别结果
 *
 * 覆盖阶段：
 * - Extracting: 截图 + loading spinner（AI 正在识别字幕）
 * - SubtitleReady: 截图 + 识别的字幕（可编辑）+ 创建按钮
 * - CreatingCard: 截图 + 字幕 + 按钮 loading（正在创建卡片）
 */
export default function SubtitleRecognizeView() {
  const tSubtitle = useTranslations('subtitleCapture');
  const locale = useLocale();
  const state = useAtomValue(captureStateAtom);
  const createMemoCard = useSetAtom(createMemoCardAtom);
  const updateSubtitleText = useSetAtom(updateSubtitleTextAtom);
  const editorRef = useRef<HTMLDivElement>(null);

  const isExtracting = state.stage === CaptureStage.Extracting;
  const isCreating = state.stage === CaptureStage.CreatingCard;

  const text = state.stage === CaptureStage.SubtitleReady || state.stage === CaptureStage.CreatingCard ? state.text : '';

  // stage 变成 SubtitleReady 时设置初始文本，之后 DOM 由浏览器管理，React 不干预
  useEffect(() => {
    if (state.stage === CaptureStage.SubtitleReady && editorRef.current) {
      editorRef.current.textContent = text;
    }
  }, [state.stage]);

  const imageUrl =
    state.stage === CaptureStage.Extracting ||
      state.stage === CaptureStage.SubtitleReady ||
      state.stage === CaptureStage.CreatingCard
      ? state.imageUrl
      : '';

  const handleCreateCard = () => {
    const channelDetail = store.get(channelDetailAtom);
    if (!channelDetail) return;
    createMemoCard({
      videoId: store.get(currentVideoIdAtom),
      contextUrl: store.get(currentVideoUrlAtom),
      channelDetail,
      videoTitle: store.get(currentVideoTitleAtom),
      getCurrentTime: () => store.get(videoPlayerRefAtom)?.getCurrentTime() || 0,
      locale,
    });
  };

  return (
    <motion.div
      key="subtitle-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      {/* 标题：识别中显示"正在提取字幕"，识别完成显示"识别完成 🎉" */}
      <FadeItem delay={0}>
        <div className="mb-8 text-center">
          <h2 className="drop-shadow-md font-medium text-[28px] text-white text-center">
            {isExtracting ? tSubtitle('extractingSubtitle') : `${tSubtitle('subtitleRecognized')} 🎉`}
          </h2>
        </div>
      </FadeItem>

      <FadeItem delay={0.08}>
        {isExtracting ? (
          // AI 正在识别字幕时的 loading spinner
          <div className="flex justify-center mb-8">
            <span className="mr-[6px] border-white border-b-2 rounded-full w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="mb-8">
            {/* 
              使用 ref 设置初始文本，不通过 React children 控制内容
              避免 contentEditable 与 React 状态同步导致的输入法组合问题
            */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              dir="ltr"
              className="outline-none font-medium text-white/90 text-2xl leading-relaxed"
              onInput={(e) => updateSubtitleText(e.currentTarget.textContent || '')}
            />
          </div>
        )}
      </FadeItem>

      {/* 视频字幕区域的截图预览 */}
      <FadeItem delay={0.12}>
        {imageUrl && (
          <div className="mb-8">
            <img
              src={imageUrl}
              alt={tSubtitle('previewAlt')}
              className="shadow-lg mx-auto border border-white/20 rounded-lg max-w-xs max-h-32 object-contain"
            />
          </div>
        )}
      </FadeItem>

      {!isExtracting && (
        <FadeItem delay={0.16}>
          <div className="flex justify-center mt-8">
            {/* 创建卡片按钮，点击后 isCreating 变为 true，按钮显示 loading */}
            <LoadingButton
              isLoading={isCreating}
              isSuccess={false}
              onClick={handleCreateCard}
              loaderColor="white"
              className="group inline-flex relative justify-center items-center gap-2 bg-transparent! hover:bg-transparent! shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_8px_rgba(0,0,0,0.06)] px-8 py-6 border border-[#FFFFFFB3] hover:border-[#FFFFFFCC] rounded-full ring-[#FFFFFF66] ring-1 w-[240px] font-medium text-[#FFFFFF] text-[16px] transform-gpu hover:scale-[1.02] transition-all duration-200 ease-out"
            >
              {tSubtitle('createMemoryCard')}
            </LoadingButton>
          </div>
        </FadeItem>
      )}
    </motion.div>
  );
}
