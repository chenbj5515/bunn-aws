"use server";

import { db } from "@/lib/db/index";
import { memoCard } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from '@/lib/auth';

/**
 * 更新memoCard的章节关联
 * @param memoCardId memoCard的ID
 * @param chapterId 章节的ID
 * @returns 更新结果
 */
export async function updateMemoCardChapter(memoCardId: string, chapterId: string | null) {
    try {
        // 获取当前会话
        const session = await getSession();
        
        if (!session) {
            return {
                success: false,
                message: "未授权操作"
            };
        }
        
        // 更新memoCard的chapterId
        await db
            .update(memoCard)
            .set({
                chapterId,
                updateTime: new Date().toISOString()
            })
            .where(
                eq(memoCard.id, memoCardId)
            );
        
        return {
            success: true,
            message: "章节关联更新成功"
        };
    } catch (error) {
        console.error("更新memoCard章节关联失败:", error);
        return {
            success: false,
            message: "章节关联更新失败"
        };
    }
} 