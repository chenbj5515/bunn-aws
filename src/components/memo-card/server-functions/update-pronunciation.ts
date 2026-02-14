"use server"
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { memoCard } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function updatePronunciation(id: string, kana_pronunciation: string) {
    const session = await getSession();

    if (!session?.user.id) {
        throw new Error('用户未登录');
    }

    const [updatedMemoCard] = await db.update(memoCard)
        .set({
            kanaPronunciation: kana_pronunciation
        })
        .where(
            and(
                eq(memoCard.id, id),
                eq(memoCard.userId, session.user.id)
            )
        )
        .returning();

    return JSON.stringify(updatedMemoCard);
}
