"use server"

import { db } from "@/lib/db/index";
import { userChannels } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * 在user_channels表中添加用户与频道的关联
 * 如果关联已存在，则不会重复添加
 * @param userId 用户ID
 * @param channelId YouTube频道ID
 * @returns 是否成功添加关联
 */
export async function insertUserChannel(userId: string, channelId: string): Promise<boolean> {
    try {
        // 先检查是否已存在这个关联
        const existingRelation = await db.select()
            .from(userChannels)
            .where(
                and(
                    eq(userChannels.userId, userId),
                    eq(userChannels.channelId, channelId)
                )
            )
            .limit(1);
            
        // 如果已存在关联，则直接返回成功
        if (existingRelation.length > 0) {
            return true;
        }
        
        // 添加新的关联记录
        const result = await db.insert(userChannels)
            .values({
                userId,
                channelId
            });
            
        return result.rowCount !== undefined && result.rowCount > 0;
    } catch (error) {
        console.error("添加用户-频道关联时出错:", error);
        return false;
    }
} 