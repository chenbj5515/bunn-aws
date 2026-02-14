"use server"
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { eq, and } from "drizzle-orm";
import { memoCard, wordCard } from "@/lib/db/schema";

export async function deleteMemoCard(id: string) {
    const session = await getSession();
    if (!session?.user?.id) {
        throw new Error('未登录');
    }

    try {
        // 先删除关联的wordCard记录
        await db.delete(wordCard)
            .where(
                and(
                    eq(wordCard.memoCardId, id),
                    eq(wordCard.userId, session.user.id)
                )
            );

        // 然后删除memoCard
        const result = await db.delete(memoCard)
            .where(
                and(
                    eq(memoCard.id, id),
                    eq(memoCard.userId, session.user.id)
                )
            )
            .returning();

        return JSON.stringify(result);
    } catch (error) {
        console.error('删除失败:', error);
        throw new Error('删除失败：' + (error instanceof Error ? error.message : String(error)));
    }
}
