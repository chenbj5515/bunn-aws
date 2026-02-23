"use server"

import { db } from "@/lib/db";
import { memoCard, wordCard, userChannels, channels, characters, videos, user } from "@/lib/db/schema";
import { eq, sql, inArray, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

const SAMPLE_CHANNEL_ID = '@marymarymary80s';

/**
 * 获取管理员用户 ID
 */
async function getAdminUserId(): Promise<string | null> {
  const adminUser = await db.query.user.findFirst({
    where: eq(user.role, 'admin'),
    columns: { id: true }
  });
  return adminUser?.id ?? null;
}

/**
 * 克隆管理员的示例卡片到当前用户
 */
export async function cloneSampleCards(targetLocale: string = 'zh') {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, error: "unauthorized" };
  }

  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    return { success: false, error: "no_admin" };
  }

  try {
    const userId = session.user.id;

    // 并行获取：用户频道订阅、样本视频、用户已有卡片
    const [existingUserChannel, sampleVideos, userExistingCards] = await Promise.all([
      db.query.userChannels.findFirst({
        where: and(eq(userChannels.userId, userId), eq(userChannels.channelId, SAMPLE_CHANNEL_ID))
      }),
      db.query.videos.findMany({
        where: eq(videos.channelId, SAMPLE_CHANNEL_ID)
      }),
      db.query.memoCard.findMany({
        where: and(eq(memoCard.userId, userId), eq(memoCard.channelId, SAMPLE_CHANNEL_ID)),
        columns: { originalText: true }
      })
    ]);

    // 确保用户订阅了样本频道
    if (!existingUserChannel) {
      await ensureUserSubscription(userId, adminUserId);
    }

    // 获取样本卡片
    const sampleCards = await db.query.memoCard.findMany({
      where: sql`${inArray(memoCard.videoId, sampleVideos.map(v => v.videoId))} AND ${eq(memoCard.userId, adminUserId)}`
    });

    // 过滤掉用户已有的卡片
    const existingTexts = new Set(userExistingCards.map(c => c.originalText));
    const availableCards = sampleCards.filter(c => !existingTexts.has(c.originalText));

    if (availableCards.length === 0) {
      return { success: false, error: "no_new_cards" };
    }

    // 随机选择最多15张卡片
    const selectedCards = availableCards
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(15, availableCards.length));

    // 获取选中卡片关联的单词卡
    const sampleWordCards = await db.query.wordCard.findMany({
      where: sql`${inArray(wordCard.memoCardId, selectedCards.map(c => c.id))} AND ${eq(wordCard.userId, adminUserId)}`
    });

    // 插入视频记录
    const selectedVideoIds = [...new Set(selectedCards.map(c => c.videoId).filter(Boolean))];
    const videosToInsert = selectedVideoIds
      .map(videoId => sampleVideos.find(v => v.videoId === videoId))
      .filter(Boolean)
      .map(v => ({
        videoId: v!.videoId,
        userId,
        channelId: v!.channelId,
        videoTitle: v!.videoTitle,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }));

    if (videosToInsert.length > 0) {
      await db.insert(videos).values(videosToInsert).onConflictDoNothing();
    }

    // 准备新卡片数据
    const now = new Date().toISOString();
    const newCardsData = selectedCards.map(card => ({
      translation: card.adminPreTranslations || card.translation,
      originalText: card.originalText,
      kanaPronunciation: card.kanaPronunciation,
      contextUrl: card.contextUrl,
      rubyTranslations: card.rubyTranslations,
      wordSegmentation: card.wordSegmentation,
      platform: card.platform,
      seriesId: card.seriesId,
      characterId: card.characterId,
      channelId: SAMPLE_CHANNEL_ID,
      bookId: card.bookId,
      chapterId: card.chapterId,
      contextInfo: card.contextInfo,
      adminPreTranslations: card.adminPreTranslations,
      question: card.question,
      questionType: card.questionType,
      hasQuestionAnswerSubmission: card.hasQuestionAnswerSubmission,
      questionAnswerSubmissions: card.questionAnswerSubmissions,
      lastQuestionAnswerSubmittedAt: card.lastQuestionAnswerSubmittedAt,
      videoId: card.videoId,
      userId,
      reviewTimes: 0,
      forgetCount: 0,
      createTime: now,
      updateTime: now,
    }));

    // 插入新卡片
    const insertedCards = await db.insert(memoCard).values(newCardsData).returning();

    // 插入关联的单词卡
    let insertedWordCardsCount = 0;
    if (sampleWordCards.length > 0) {
      const insertedCardMap = new Map(insertedCards.map(c => [c.originalText, c]));
      
      const wordCardsData = selectedCards.flatMap(card => {
        const insertedCard = insertedCardMap.get(card.originalText);
        if (!insertedCard) return [];
        
        return sampleWordCards
          .filter(wc => wc.memoCardId === card.id)
          .map(wc => ({
            word: wc.word,
            kanaPronunciation: wc.kanaPronunciation,
            meaning: getLocalizedMeaning(wc.adminPreTranslations, targetLocale, wc.meaning),
            meaning_new: wc.meaning_new,
            meaningDistractions: wc.meaningDistractions,
            pronunciationDistractions: wc.pronunciationDistractions,
            createTime: now,
            userId,
            reviewTimes: 0,
            forgetCount: 0,
            memoCardId: insertedCard.id,
            adminPreTranslations: wc.adminPreTranslations
          }));
      });

      if (wordCardsData.length > 0) {
        const insertedWordCards = await db.insert(wordCard).values(wordCardsData).returning();
        insertedWordCardsCount = insertedWordCards.length;
      }
    }

    return {
      success: true,
      count: insertedCards.length,
      wordCardsCount: insertedWordCardsCount
    };

  } catch (error) {
    console.error("[cloneSampleCards] Error:", error);
    return { success: false, error: "internal_error" };
  }
}

/**
 * 确保用户订阅了样本频道并复制角色数据
 */
async function ensureUserSubscription(userId: string, adminUserId: string) {
  const channelInfo = await db.query.channels.findFirst({
    where: eq(channels.channelId, SAMPLE_CHANNEL_ID)
  });

  if (!channelInfo) return;

  const now = new Date().toISOString();

  // 订阅频道
  await db.insert(userChannels).values({
    userId,
    channelId: SAMPLE_CHANNEL_ID,
    channelName: channelInfo.channelName,
    avatarUrl: channelInfo.avatarUrl,
    bannerUrl: channelInfo.bannerUrl,
    createTime: now,
    updateTime: now
  });

  // 复制管理员的角色数据
  const adminCharacters = await db.query.characters.findMany({
    where: and(eq(characters.channelId, SAMPLE_CHANNEL_ID), eq(characters.userId, adminUserId))
  });

  if (adminCharacters.length > 0) {
    const newCharacters = adminCharacters.map(c => ({
      name: c.name,
      description: c.description,
      avatarUrl: c.avatarUrl,
      seriesId: c.seriesId,
      channelId: SAMPLE_CHANNEL_ID,
      userId,
      createTime: now,
      updateTime: now
    }));
    await db.insert(characters).values(newCharacters);
  }
}

/**
 * 根据目标语言环境获取本地化的单词含义
 */
function getLocalizedMeaning(
  adminPreTranslations: unknown,
  targetLocale: string,
  fallback: string
): string {
  if (!adminPreTranslations || typeof adminPreTranslations !== 'object') {
    return fallback;
  }
  
  const translations = adminPreTranslations as Record<string, string>;
  const localeKey = targetLocale === 'zh-TW' ? 'zh-TW' : targetLocale.split('-')[0];
  
  return translations[localeKey] || translations['zh'] || fallback;
}
