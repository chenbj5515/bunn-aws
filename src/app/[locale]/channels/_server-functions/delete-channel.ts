'use server';

import { db } from '@/lib/db/index';
import { userChannels, videos, memoCard } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

interface DeleteChannelResult {
  success: boolean;
  message?: string;
}

/**
 * 删除频道（从频道列表页）
 * 删除用户与频道的关联及相关数据
 */
export async function deleteChannel(channelId: string): Promise<DeleteChannelResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, message: '未授权' };
  }

  const userId = session.user.id;

  try {
    // 删除用户与频道的关联
    await db
      .delete(userChannels)
      .where(and(eq(userChannels.channelId, channelId), eq(userChannels.userId, userId)));

    // 删除该频道下用户的所有视频
    await db
      .delete(videos)
      .where(and(eq(videos.channelId, channelId), eq(videos.userId, userId)));

    // 删除该频道下用户的所有记忆卡片
    await db
      .delete(memoCard)
      .where(and(eq(memoCard.channelId, channelId), eq(memoCard.userId, userId)));

    return { success: true };
  } catch (error) {
    console.error('删除频道失败:', error);
    return { success: false, message: '删除失败，请重试' };
  }
}
