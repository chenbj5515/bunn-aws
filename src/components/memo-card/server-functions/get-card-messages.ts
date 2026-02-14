"use server"

import { db } from "@/lib/db/index";
import { memoCardMessages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export interface HistoryMessage {
  id: string;
  role: string;
  content: string;
  isInitialAnalysis: boolean | null;
  createTime: string;
  messageOrder: number | null;
  memoCardId: string;
}

/**
 * 获取指定记忆卡片的消息历史
 * @param cardId 记忆卡片ID
 * @returns 消息历史列表或错误信息
 */
export async function getCardMessages(cardId: string) {
  try {
    // 验证用户会话
    const session = await getSession();
    if (!session) {
      return { success: false, message: "未授权访问", messages: [] };
    }

    // 获取指定卡片的消息列表
    const messages = await db
      .select()
      .from(memoCardMessages)
      .where(eq(memoCardMessages.memoCardId, cardId))
      .orderBy(memoCardMessages.messageOrder);

    return { 
      success: true, 
      messages: messages as HistoryMessage[] 
    };
  } catch (error) {
    console.error("获取卡片消息失败:", error);
    return { 
      success: false, 
      message: "获取消息失败，请稍后再试", 
      messages: [] 
    };
  }
} 