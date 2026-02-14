"use server"
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { eq, and } from "drizzle-orm";
import { memoCard } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function updateOriginalText(id: string, original_text: string) {
    const session = await getSession();

    if (!session?.user.id) {
        throw new Error('用户未登录');
    }

    const result = await db.update(memoCard)
        .set({ 
            originalText: original_text,
            updateTime: sql`CURRENT_TIMESTAMP`
        })
        .where(
            and(
                eq(memoCard.id, id),
                eq(memoCard.userId, session.user.id)
            )
        )
        .returning();

    return JSON.stringify(result);
}
