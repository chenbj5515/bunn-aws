'use server';

import { db } from '@/lib/db';
import { memoCard } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

interface ContextInfo {
  en?: string;
  zh?: string;
  'zh-TW'?: string;
}

export async function updateContextInfo(memoCardId: string, contextInfo: ContextInfo[]) {
  try {
    const session = await getSession();

    if (!session) {
      throw new Error('User not authenticated');
    }

    // 验证用户有权限更新这个卡片
    const existingCard = await db
      .select()
      .from(memoCard)
      .where(eq(memoCard.id, memoCardId))
      .limit(1);

    if (!existingCard.length) {
      throw new Error('Memo card not found');
    }

    if (existingCard[0]!.userId !== session.user.id) {
      throw new Error('Access denied');
    }

    // 更新contextInfo字段
    await db
      .update(memoCard)
      .set({
        contextInfo: contextInfo,
        updateTime: new Date().toISOString(),
      })
      .where(eq(memoCard.id, memoCardId));

    return {
      success: true,
      message: 'Context info updated successfully'
    };

  } catch (error) {
    console.error('Error updating context info:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update context info'
    };
  }
}
