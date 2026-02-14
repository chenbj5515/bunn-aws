"use server";

import { getSession } from '@/lib/auth';
import { db } from '@/lib/db/index';
import { memoCard } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateMemoCardAvatarUrl(
  memoCardId: string,
  avatarUrl: string | null
): Promise<{ success: boolean; message?: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, message: '请先登录' };
    }

    if (!memoCardId) {
      return { success: false, message: '记忆卡片ID不能为空' };
    }

    await db
      .update(memoCard)
      .set({
        avatarUrl,
        updateTime: new Date().toISOString(),
      })
      .where(
        and(
          eq(memoCard.id, memoCardId),
          eq(memoCard.userId, session.user.id)
        )
      );

    revalidatePath('/[locale]/daily-task');

    return { success: true };
  } catch (error) {
    console.error('更新记忆卡片头像失败:', error);
    return { success: false, message: '更新失败' };
  }
}


