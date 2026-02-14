import { atom } from "jotai";
import type { MemoCardDisplayState, MemoCardWithChannel, ChannelDetail } from "../types";
import { createInitialMemoCardDisplayState } from "../types";
import { currentVideoIdAtom } from "./video";

// ============================================
// 核心状态
// ============================================

/**
 * 记忆卡片展示状态
 */
export const memoCardDisplayStateAtom = atom<MemoCardDisplayState>(
  createInitialMemoCardDisplayState()
);

/**
 * 频道详情
 */
export const channelDetailAtom = atom<ChannelDetail | null>(null);

/**
 * 记忆卡片列表
 */
export const memoCardListAtom = atom<MemoCardWithChannel[]>([]);

/**
 * 是否有问答入口资格
 */
export const eligibleForQuestionEntryAtom = atom<boolean>(false);

// ============================================
// 派生状态
// ============================================

/** 是否显示记忆卡片 */
export const showMemoCardAtom = atom((get) => get(memoCardDisplayStateAtom).showMemoCard);

/** 选中的记忆卡片 ID */
export const selectedMemoCardIdAtom = atom((get) => get(memoCardDisplayStateAtom).selectedMemoCardId);

/** 当前选中的记忆卡片 */
export const selectedMemoCardAtom = atom((get) => {
  const id = get(selectedMemoCardIdAtom);
  if (!id) return null;
  return get(memoCardListAtom).find(c => c.id === id) || null;
});

/** 当前视频的标记列表 */
export const currentVideoMarkersAtom = atom((get) => {
  const currentVideoId = get(currentVideoIdAtom);
  const memoCards = get(memoCardListAtom);
  const channelDetail = get(channelDetailAtom);

  const list = memoCards.filter(c => c.videoId === currentVideoId);

  return list.map((c, idx) => ({
    id: c.id,
    contextUrl: c.contextUrl || channelDetail?.channelUrl || '',
    avatarUrl: c.avatarUrl || channelDetail?.avatarUrl,
    title: c.originalText || '',
    order: idx,
  }));
});

/** 当前视频 URL */
export const currentVideoUrlAtom = atom((get) => {
  const currentVideoId = get(currentVideoIdAtom);
  const memoCards = get(memoCardListAtom);
  const channelDetail = get(channelDetailAtom);

  const firstCard = memoCards.find(c => c.videoId === currentVideoId);
  const originalUrl = firstCard?.contextUrl || 
    (currentVideoId ? `https://www.youtube.com/watch?v=${currentVideoId}` : channelDetail?.channelUrl || '');

  // 移除 YouTube URL 的时间参数
  if (originalUrl.includes('youtube.com/watch') || originalUrl.includes('youtu.be/')) {
    try {
      const url = new URL(originalUrl);
      url.searchParams.delete('t');
      url.searchParams.delete('start');
      return url.toString();
    } catch {
      return originalUrl;
    }
  }

  return originalUrl;
});

// ============================================
// Action Atoms
// ============================================

/**
 * 初始化频道数据
 */
export const initializeChannelDataAtom = atom(
  null,
  (_get, set, payload: {
    channelDetail: ChannelDetail;
    memoCardList: MemoCardWithChannel[];
    eligibleForQuestionEntry: boolean;
  }) => {
    set(channelDetailAtom, payload.channelDetail);
    set(memoCardListAtom, payload.memoCardList);
    set(eligibleForQuestionEntryAtom, payload.eligibleForQuestionEntry);
  }
);

/**
 * 更新记忆卡片列表（用于切换视频时更新）
 */
export const setMemoCardListAtom = atom(
  null,
  (_get, set, memoCardList: MemoCardWithChannel[]) => {
    set(memoCardListAtom, memoCardList);
  }
);

/**
 * 显示记忆卡片
 */
export const showMemoCardModalAtom = atom(
  null,
  (_get, set, memoCardId: string) => {
    set(memoCardDisplayStateAtom, {
      showMemoCard: true,
      selectedMemoCardId: memoCardId,
    });
  }
);

/**
 * 隐藏记忆卡片
 */
export const hideMemoCardModalAtom = atom(
  null,
  (_get, set) => {
    set(memoCardDisplayStateAtom, createInitialMemoCardDisplayState());
  }
);

/**
 * 更新记忆卡片翻译（同步本地状态）
 */
export const updateMemoCardTranslationAtom = atom(
  null,
  (get, set, payload: { id: string; translation: Record<string, string> }) => {
    const currentList = get(memoCardListAtom);
    const updatedList = currentList.map(card => 
      card.id === payload.id 
        ? { ...card, translation: payload.translation }
        : card
    );
    set(memoCardListAtom, updatedList);
  }
);

/**
 * 更新记忆卡片笔记/上下文（同步本地状态）
 */
export const updateMemoCardContextInfoAtom = atom(
  null,
  (get, set, payload: { id: string; contextInfo: Array<{ zh: string; en: string; 'zh-TW': string }> }) => {
    const currentList = get(memoCardListAtom);
    const updatedList = currentList.map(card => 
      card.id === payload.id 
        ? { ...card, contextInfo: payload.contextInfo }
        : card
    );
    set(memoCardListAtom, updatedList);
  }
);
