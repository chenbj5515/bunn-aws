"use server"
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { memoCard, userActionLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function updateReviewTimes(id: string) {
    const session = await getSession();

    if (!session?.user.id) {
        throw new Error('ユーザー未登録');
    }

    const updatedMemoCard = await db
        .update(memoCard)
        .set({
            reviewTimes: sql`${memoCard.reviewTimes} + 1`
        })
        .where(
            and(
                eq(memoCard.id, id),
                eq(memoCard.userId, session.user.id)
            )
        )
        .returning();

    // ログは非同期で記録
    db.insert(userActionLogs).values({
        userId: session.user.id,
        actionType: 'COMPLETE_SENTENCE_REVIEW',
        relatedId: id,
        relatedType: 'memo_card'
    }).catch((error: Error) => {
        console.error('Failed to create action log:', error);
    });

    return JSON.stringify(updatedMemoCard);
}