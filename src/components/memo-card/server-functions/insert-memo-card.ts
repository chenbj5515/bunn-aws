"use server"

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { memoCard, userActionLogs } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

// ============================================
// Types
// ============================================

interface YouTubeContext {
  channelId: string;
  channelName?: string;
  videoId: string;
  videoTitle?: string;
  avatarUrl?: string;
}

// ============================================
// Post-processing (async, non-blocking)
// ============================================

function schedulePostProcessing(
  cardId: string,
  userId: string,
  originalText: string,
) {
  // void preloadTTSCacheServer(originalText);

  void db.insert(userActionLogs).values({
    userId,
    actionType: "CREATE_MEMO",
    relatedId: cardId,
    relatedType: "memo_card"
  });
}

// ============================================
// Main Function
// ============================================

export async function insertMemoCard(
  originalText: string,
  translation: Record<string, string> | string,
  pronunciation: string,
  rubyTranslations: Record<string, Record<string, string>>,
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
    kanaPronunciation: pronunciation ? JSON.parse(pronunciation) : null,
    createTime: sql`CURRENT_TIMESTAMP`,
    updateTime: sql`CURRENT_TIMESTAMP`,
    contextUrl,
    platform: 'youtube',
    channelId: ctx.channelId,
    videoId: ctx.videoId,
    rubyTranslations: Object.keys(rubyTranslations).length > 0 ? rubyTranslations : null,
  }).returning();

  if (!newCard) return null;

  // Schedule async post-processing
  schedulePostProcessing(newCard.id, session.user.id, originalText);

  return JSON.stringify(newCard);
}
