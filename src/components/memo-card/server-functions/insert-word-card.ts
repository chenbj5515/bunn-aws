"use server"
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { wordCard } from "@/lib/db/schema";
import { generateAdminPreTranslations } from "./admin-pre-translations";
import { headers } from "next/headers";
import { generateMultilingualMeaningForWord } from "@/server-functions/generate-word-meaning-multilingual";
import { generateAndSaveDistractions } from "./generate-word-distractions";

export async function insertWordCard(word: string, meaning: string, memoCardId: string, kanaPronunciation?: string) {
    const session = await getSession()
    const headersList = await headers();
    const cookieHeader = headersList.get('cookie') || '';

    if (!session) {
        return new Error("Unauthorized")
    }
    let newWordCard = {}

    if (session?.user?.id) {
        // 生成多语言版本的meaning
        let meaningNew = null;
        try {
            meaningNew = await generateMultilingualMeaningForWord({
                word: word,
                meaning: meaning
            });
        } catch (error) {
            console.error('生成多语言meaning失败:', error);
            // 如果生成失败，meaningNew保持为null，后续仍可以使用原有的meaning字段
        }

        newWordCard = await db.insert(wordCard).values({
            word: word,
            meaning: meaning,
            meaning_new: meaningNew,
            kanaPronunciation: kanaPronunciation ?? '',
            createTime: new Date().toISOString(),
            userId: session.user.id,
            memoCardId: memoCardId,
        }).returning();

        // 为系统管理员生成预翻译（后台任务）
        if (Array.isArray(newWordCard) && newWordCard.length > 0) {
            void generateAdminPreTranslations(
                session.user.id,
                'wordCard',
                newWordCard[0].id,
                {
                    word: word,
                    meaning: meaning
                },
                {
                    'Cookie': cookieHeader
                }
            );

            void generateAndSaveDistractions(newWordCard[0].id, { word, meaning, meaningNew, kanaPronunciation }, cookieHeader).catch(console.error);
        }
    }

    return JSON.stringify(newWordCard);
}
