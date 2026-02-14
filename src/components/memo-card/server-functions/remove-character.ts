"use server"

import { db } from "@/lib/db";
import { memoCard } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * 解除memo card与角色的绑定关系
 * @param memoCardId memo card的ID
 * @returns 返回操作结果
 */
export async function removeMemoCardCharacter(memoCardId: string) {
    try {
        // 使用drizzle ORM更新memoCard表，将characterId字段设为null
        await db.update(memoCard)
            .set({ characterId: null })
            .where(eq(memoCard.id, memoCardId));

        return { success: true };
    } catch (error) {
        console.error('解除角色绑定失败:', error);
        return { 
            success: false, 
            message: error instanceof Error ? error.message : '解除角色绑定失败' 
        };
    }
} 