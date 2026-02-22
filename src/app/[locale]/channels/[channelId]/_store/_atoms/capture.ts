import { atom } from "jotai";
import { trpc } from "@/lib/trpc-client";
import { insertMemoCard } from "@/components/memo-card/server-functions/insert-memo-card";
import type { CaptureState, MemoCardWithChannel, ChannelDetail } from "../types";
import { createInitialCaptureState, CaptureStage, CaptureFailureReason } from "../types";
import {
  requestScreenPermission,
  captureScreenshot,
  extractSubtitlesFromImage,
  appendTimestampToYouTubeUrl,
  preprocessText,
} from "../_helpers";
import { memoCardListAtom } from "./memo-card";

// ============================================
// 核心状态
// ============================================

/**
 * 截屏流程状态
 */
export const captureStateAtom = atom<CaptureState>(createInitialCaptureState());

/**
 * 用于取消异步操作的 AbortController
 * 每次开始新的截屏流程时创建，关闭时调用 abort
 */
let abortController: AbortController | null = null;

/**
 * 检查是否已取消
 */
function checkAborted(): boolean {
  return abortController?.signal.aborted ?? false;
}

// ============================================
// 派生状态
// ============================================

/** 是否正在截屏流程中（非 idle） */
export const isCapturingAtom = atom((get) => {
  return get(captureStateAtom).stage !== CaptureStage.Idle;
});

/** 是否显示截屏对话框（截图完成后才显示，避免截取到蒙层） */
export const showCaptureDialogAtom = atom((get) => {
  const { stage } = get(captureStateAtom);
  return stage !== CaptureStage.Idle
    && stage !== CaptureStage.RequestingPermission
    && stage !== CaptureStage.Capturing;
});

/** 是否显示限流提示 */
export const showLimitRateAtom = atom((get) => {
  return get(captureStateAtom).stage === CaptureStage.RateLimited;
});

// ============================================
// Action Atoms
// ============================================

/**
 * 开始截屏流程
 */
export const startCaptureAtom = atom(
  null,
  async (_get, set, videoId: string) => {
    // 创建新的 AbortController，取消之前的
    abortController?.abort();
    abortController = new AbortController();

    // 1. 请求屏幕权限
    set(captureStateAtom, { stage: CaptureStage.RequestingPermission });

    const permissionResult = await requestScreenPermission();
    if (checkAborted()) return { success: false, reason: 'aborted' };
    if (!permissionResult.ok) {
      set(captureStateAtom, { stage: CaptureStage.Idle });
      return { success: false, reason: permissionResult.reason };
    }

    // 2. 截取屏幕图片
    set(captureStateAtom, { stage: CaptureStage.Capturing });

    const screenshotResult = await captureScreenshot(permissionResult.stream, videoId);
    if (checkAborted()) {
      if (screenshotResult.ok && screenshotResult.imageUrl) {
        URL.revokeObjectURL(screenshotResult.imageUrl);
      }
      return { success: false, reason: 'aborted' };
    }
    if (!screenshotResult.ok) {
      set(captureStateAtom, { stage: CaptureStage.Error, message: '无法获取屏幕画面' });
      return { success: false, reason: screenshotResult.reason };
    }

    const { imageBlob, imageUrl } = screenshotResult;

    // 3. 提取字幕
    set(captureStateAtom, { stage: CaptureStage.Extracting, imageUrl });

    const extractResult = await extractSubtitlesFromImage(imageBlob);
    if (checkAborted()) {
      URL.revokeObjectURL(imageUrl);
      return { success: false, reason: 'aborted' };
    }
    if (!extractResult.ok) {
      if (extractResult.reason === CaptureFailureReason.RateLimited) {
        set(captureStateAtom, { stage: CaptureStage.RateLimited, imageUrl });
      } else {
        set(captureStateAtom, { stage: CaptureStage.Error, message: '未识别到字幕', imageUrl });
      }
      return { success: false, reason: extractResult.reason };
    }

    // 4. 字幕就绪，等待用户确认
    set(captureStateAtom, { stage: CaptureStage.SubtitleReady, text: extractResult.subtitles, imageUrl });
    return { success: true };
  }
);

interface CreateMemoCardParams {
  videoId: string;
  contextUrl: string;
  channelDetail: ChannelDetail;
  videoTitle: string | null;
  getCurrentTime: () => number;
  locale: string;
}

/**
 * 创建记忆卡片
 */
export const createMemoCardAtom = atom(
  null,
  async (get, set, params: CreateMemoCardParams) => {
    const state = get(captureStateAtom);
    if (state.stage !== CaptureStage.SubtitleReady) return { success: false };

    const { text, imageUrl } = state;
    const { contextUrl, channelDetail, videoTitle, getCurrentTime, locale, videoId } = params;

    try {
      set(captureStateAtom, { stage: CaptureStage.CreatingCard, text, imageUrl });

      const urlWithTimestamp = appendTimestampToYouTubeUrl(contextUrl, getCurrentTime);

      const processedText = preprocessText(text);

      // AI 翻译 + 分词
      const aiResult = await trpc.ai.translateAndSegment.mutate({
        text: processedText,
        fallbackLocale: locale,
      });
      if (checkAborted()) {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        return { success: false, reason: 'aborted' };
      }
      if (aiResult.errorCode !== null) {
        set(captureStateAtom, { stage: CaptureStage.RateLimited, imageUrl });
        return { success: false, reason: CaptureFailureReason.RateLimited };
      }

      // 持久化
      const cardJson = await insertMemoCard(
        text,
        aiResult.translation,
        aiResult.wordSegmentation,
        urlWithTimestamp,
        {
          channelId: channelDetail.channelId,
          channelName: channelDetail.channelName,
          videoId: videoId,
          videoTitle: videoTitle || '',
          avatarUrl: channelDetail.avatarUrl || '',
        }
      );
      if (checkAborted()) {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        return { success: false, reason: 'aborted' };
      }
      if (!cardJson) throw new Error('创建记忆卡片失败');
      const newCard = JSON.parse(cardJson);

      // 构建符合 MemoCardWithChannel 类型的卡片对象
      const newCardWithChannel: MemoCardWithChannel = {
        ...newCard,
        translation: aiResult.translation, // 使用原始的翻译对象，而非序列化后的字符串
        channelId: channelDetail.channelId,
        videoId: videoId,
        videoTitle: videoTitle || null,
      };

      // 更新 memo card 列表，使进度条立即显示新标记
      const currentList = get(memoCardListAtom);
      set(memoCardListAtom, [...currentList, newCardWithChannel]);

      set(captureStateAtom, { stage: CaptureStage.Completed, cardData: newCardWithChannel, imageUrl });
      return { success: true, card: newCardWithChannel };

    } catch (error) {
      if (checkAborted()) {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        return { success: false, reason: 'aborted' };
      }
      const message = error instanceof Error ? error.message : '创建失败';
      set(captureStateAtom, { stage: CaptureStage.Error, message, imageUrl });
      return { success: false, reason: CaptureFailureReason.Error, message };
    }
  }
);

/**
 * 更新字幕文本（用户编辑）
 */
export const updateSubtitleTextAtom = atom(
  null,
  (get, set, newText: string) => {
    const state = get(captureStateAtom);
    if (state.stage === CaptureStage.SubtitleReady) {
      set(captureStateAtom, { ...state, text: newText });
    }
  }
);

/**
 * 关闭截屏对话框并重置状态
 * 会取消所有正在进行的异步操作
 */
export const closeCaptureAtom = atom(
  null,
  (get, set) => {
    // 取消正在进行的异步操作
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    const state = get(captureStateAtom);
    // 清理 imageUrl
    if ('imageUrl' in state && state.imageUrl) {
      URL.revokeObjectURL(state.imageUrl);
    }
    set(captureStateAtom, { stage: CaptureStage.Idle });
  }
);

/**
 * 关闭限流提示
 */
export const closeLimitRateAtom = atom(
  null,
  (get, set) => {
    const state = get(captureStateAtom);
    if (state.stage === CaptureStage.RateLimited) {
      if (state.imageUrl) {
        URL.revokeObjectURL(state.imageUrl);
      }
      set(captureStateAtom, { stage: CaptureStage.Idle });
    }
  }
);
