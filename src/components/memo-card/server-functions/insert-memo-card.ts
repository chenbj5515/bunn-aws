"use server"

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { memoCard, userActionLogs, wordCard } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import type { WordSegmentationV2 } from "@/types/extended-memo-card";

interface YouTubeContext {
  channelId: string;
  channelName?: string;
  videoId: string;
  videoTitle?: string;
  avatarUrl?: string;
}

interface AutoWordCandidate {
  word: string;
  meaning: string;
  kanaPronunciation?: string;
}

function getAutoWordCandidate(wordSegmentation: WordSegmentationV2): AutoWordCandidate | null {
  const translatedSegments = wordSegmentation.segments.filter((segment) => {
    if (!segment.translations) {
      return false;
    }

    const meaning =
      segment.translations.zh
      || segment.translations.en
      || segment.translations["zh-TW"];

    return Boolean(segment.word.trim()) && Boolean(meaning?.trim());
  });

  if (translatedSegments.length === 0) {
    return null;
  }

  const longestSegment = translatedSegments.reduce((longest, current) => {
    return current.word.length > longest.word.length ? current : longest;
  });

  const meaning =
    longestSegment.translations?.zh
    || longestSegment.translations?.en
    || longestSegment.translations?.["zh-TW"];

  if (!meaning) {
    return null;
  }

  return {
    word: longestSegment.word,
    meaning,
    kanaPronunciation: longestSegment.ruby,
  };
}

// ============================================
// Post-processing (async, non-blocking)
// ============================================

function schedulePostProcessing(
  cardId: string,
  userId: string,
  originalText: string,
  wordSegmentation: WordSegmentationV2,
) {
  // void preloadTTSCacheServer(originalText);

  void db.insert(userActionLogs).values({
    userId,
    actionType: "CREATE_MEMO",
    relatedId: cardId,
    relatedType: "memo_card"
  });

  const autoWordCandidate = getAutoWordCandidate(wordSegmentation);
  if (!autoWordCandidate) {
    return;
  }

  void db.insert(wordCard).values({
    word: autoWordCandidate.word,
    meaning: autoWordCandidate.meaning,
    kanaPronunciation: autoWordCandidate.kanaPronunciation ?? "",
    createTime: sql`CURRENT_TIMESTAMP`,
    userId,
    memoCardId: cardId,
  }).catch((error) => {
    console.error("自动添加单词失败:", error);
  });
}

// ============================================
// Main Function
// ============================================

export async function insertMemoCard(
  originalText: string,
  translation: Record<string, string> | string,
  wordSegmentation: WordSegmentationV2,
  contextUrl: string,
  ctx: YouTubeContext
) {
  const session = await getSession();
  if (!session?.user.id) return null;

  const [newCard] = await db.insert(memoCard).values({
    recordFilePath: "",
    originalText,
    reviewTimes: 0,
    translation: typeof translation === 'string' ? translation : JSON.stringify(translation),
    userId: session.user.id,
    wordSegmentation,
    createTime: sql`CURRENT_TIMESTAMP`,
    updateTime: sql`CURRENT_TIMESTAMP`,
    contextUrl,
    platform: 'youtube',
    channelId: ctx.channelId,
    videoId: ctx.videoId,
    avatarUrl: ctx.avatarUrl || null,
  }).returning();

  if (!newCard) return null;

  // Schedule async post-processing
  schedulePostProcessing(newCard.id, session.user.id, originalText, wordSegmentation);

  return JSON.stringify(newCard);
}
