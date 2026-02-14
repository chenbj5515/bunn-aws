"use server"

import { db } from "@/lib/db/index";
import { memoCard, wordCard } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function generateTranslation(_content: string, _type: 'sentence' | 'word', _headers: Record<string, string>) {
    return {};
}

// 更新记忆卡片的预翻译
async function updateMemoCardTranslation(cardId: string, translations: Record<string, string>) {
    await db
        .update(memoCard)
        .set({
            adminPreTranslations: translations,
            updateTime: new Date().toISOString(),
        })
        .where(eq(memoCard.id, cardId));
}

// 更新单词卡片的预翻译
async function updateWordCardTranslation(cardId: string, translations: Record<string, string>) {
    await db
        .update(wordCard)
        .set({
            adminPreTranslations: translations,
        })
        .where(eq(wordCard.id, cardId));
}

// 为系统管理员的内容生成预翻译（单个卡片）
export async function generateAdminPreTranslations(
  userId: string,
  contentType: 'memoCard' | 'wordCard',
  contentId: string,
  content: {
    originalText?: string | null;
    translation?: any;
    word?: string | null;
    meaning?: string | null;
  },
  headers: Record<string, string>
) {
  // 只为系统管理员生成预翻译
    if (userId !== 'e390urIOYotFcXkyOXY0MxxrgJcfyiHq') {
    return;
  }

    try {
  if (contentType === 'memoCard' && content.originalText) {
            const translations = await generateTranslation(content.originalText, 'sentence', headers);
            await updateMemoCardTranslation(contentId, translations);
            
  } else if (contentType === 'wordCard' && content.word && content.meaning) {
            const translations = await generateTranslation(content.word, 'word', headers);
            await updateWordCardTranslation(contentId, translations);
            
          }
        } catch (error) {
        console.error(`❌ 预翻译生成失败 ${contentType} ${contentId}:`, error);
    }
}