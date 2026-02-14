import { getSession, getUserSettings } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { memoCard, wordCard, videos, channels } from "@/lib/db/schema";
import { and, eq, sql, inArray } from "drizzle-orm";
import { DailyTaskClient } from "./_components/daily-task-client";
import { MEMO_CARD_LIMIT } from "./_utils/constants";
import type { WordSegmentation } from "@/types/extended-memo-card";

export default async function DailyTaskPage() {
    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) {
        redirect("/login");
    }

    // 1. 获取排序后的 memoCard IDs、videoIds 和 channelIds
    const memoCardRecords = await db
        .select({ id: memoCard.id, videoId: memoCard.videoId, channelId: memoCard.channelId })
        .from(memoCard)
        .where(and(eq(memoCard.userId, userId), eq(memoCard.platform, 'youtube')))
        .orderBy(
            sql`${memoCard.lastWrongTime} IS NOT NULL DESC`,
            sql`${memoCard.reviewTimes} = 0 DESC`,
            sql`${memoCard.reviewTimes} ASC`,
            sql`${memoCard.lastCorrectTime} ASC NULLS FIRST`,
            sql`RANDOM()`
        )
        .limit(MEMO_CARD_LIMIT);

    if (memoCardRecords.length === 0) {
        return <div>暂无卡片</div>;
    }

    const memoCardIds = memoCardRecords.map(r => r.id);
    const videoIds = [...new Set(memoCardRecords.map(r => r.videoId).filter(Boolean))] as string[];
    const channelIds = [...new Set(memoCardRecords.map(r => r.channelId).filter(Boolean))] as string[];

    // 2. 并行获取 memoCards + words + videos + channels + userSettings
    const [memoCards, words, allVideos, allChannels, userSettings] = await Promise.all([
        db.select().from(memoCard).where(inArray(memoCard.id, memoCardIds)),
        db.select().from(wordCard).where(inArray(wordCard.memoCardId, memoCardIds)),
        videoIds.length > 0
            ? db.select().from(videos).where(and(eq(videos.userId, userId), inArray(videos.videoId, videoIds)))
            : Promise.resolve([]),
        channelIds.length > 0
            ? db.select().from(channels).where(inArray(channels.channelId, channelIds))
            : Promise.resolve([]),
        getUserSettings(userId),
    ]);

    // 获取用户初始积分
    const initialAchievementPoints = userSettings.achievementPoints || 0;

    // 3. 构建Map便于快速查找
    const wordsMap = new Map<string, typeof words>();
    words.forEach(w => {
        const arr = wordsMap.get(w.memoCardId) || [];
        arr.push(w);
        wordsMap.set(w.memoCardId, arr);
    });
    const videosMap = new Map(allVideos.map(v => [v.videoId, v]));
    const channelsMap = new Map(allChannels.map(c => [c.channelId, c]));

    // 4. 按原始排序组装结果，avatarUrl 优先使用 memoCard 的，fallback 到 channel 的
    const idOrder = new Map(memoCardIds.map((id, i) => [id, i]));
    const result = memoCards
        .sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0))
        .map(card => {
            const channel = card.channelId ? channelsMap.get(card.channelId) : null;
            return {
                ...card,
                wordSegmentation: card.wordSegmentation as WordSegmentation | null,
                avatarUrl: card.avatarUrl ?? channel?.avatarUrl ?? null,
                words: wordsMap.get(card.id) || [],
                video: card.videoId ? videosMap.get(card.videoId) || null : null,
            };
        });

    return (
        <DailyTaskClient 
            extendedMemoCards={result} 
            initialAchievementPoints={initialAchievementPoints}
        />
    );
}