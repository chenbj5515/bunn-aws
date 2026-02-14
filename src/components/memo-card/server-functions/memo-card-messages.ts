'use server';

import { db } from '@/lib/db/index';
import { memoCardMessages } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

/**
 * 保存MemoCard消息到数据库
 */
export async function saveMemoCardMessage(
  memoCardId: string,
  role: string,
  content: string,
  isInitialAnalysis: boolean
) {
  try {
    // 验证用户身份
    const session = await getSession();
    if (!session || !session.user) {
      throw new Error('未授权');
    }

    // 将消息保存到数据库
    const result = await db.insert(memoCardMessages).values({
      memoCardId,
      role,
      content,
      isInitialAnalysis: isInitialAnalysis || false,
      createTime: new Date().toISOString(),
    }).returning();

    // 移除重新验证路径的调用，避免页面重新加载
    // revalidatePath('/memo-cards');
    
    return { success: true, message: result[0] };
  } catch (error) {
    console.error('保存消息失败:', error);
    return { success: false, error };
  }
}

/**
 * 获取特定MemoCard的所有消息
 */
export async function getMemoCardMessages(memoCardId: string) {
  try {
    // 验证用户身份
    const session = await getSession();
    if (!session || !session.user) {
      throw new Error('未授权');
    }

    if (!memoCardId) {
      throw new Error('缺少memoCardId参数');
    }

    // 查询数据库
    const messages = await db.select().from(memoCardMessages)
      .where(eq(memoCardMessages.memoCardId, memoCardId))
      .orderBy(memoCardMessages.messageOrder);

    return { success: true, messages };
  } catch (error) {
    console.error('获取消息失败:', error);
    return { success: false, error: '获取消息失败' };
  }
} 