'use server';

import { db } from '@/lib/db/index';
import { userChannels, videos, memoCard, wordCard, characters } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

interface DeleteChannelResult {
  success: boolean;
  message?: string;
}

/**
 * 删除频道（从频道列表页）
 * 删除用户与频道的关联及相关数据
 * 
 * 删除顺序（从最底层开始）：
 * 1. wordCard - 关联到 memoCard，无 cascade，必须先删
 * 2. memoCard - 通过 channelId 关联（memoCardMessages 和 seriesMetadata 会 cascade 删除）
 * 3. videos - 关联到频道
 * 4. characters - 关联到频道的用户角色
 * 5. userChannels - 用户与频道的关联
 */
export async function deleteChannel(channelId: string): Promise<DeleteChannelResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, message: '未授权' };
  }

  const userId = session.user.id;

  try {
    // 1. 获取该频道下用户的所有记忆卡片 ID
    const memoCards = await db
      .select({ id: memoCard.id })
      .from(memoCard)
      .where(and(eq(memoCard.userId, userId), eq(memoCard.channelId, channelId)));

    const memoCardIds = memoCards.map((m) => m.id);

    // 2. 删除关联到这些记忆卡片的单词卡片（wordCard 没有 cascade，必须手动删除）
    if (memoCardIds.length > 0) {
      await db.delete(wordCard).where(inArray(wordCard.memoCardId, memoCardIds));
    }

    // 3. 删除该频道下用户的所有记忆卡片
    // （memoCardMessages 和 seriesMetadata 会因为 onDelete: cascade 自动删除）
    if (memoCardIds.length > 0) {
      await db.delete(memoCard).where(inArray(memoCard.id, memoCardIds));
    }

    // 4. 删除该频道下用户的所有视频
    await db
      .delete(videos)
      .where(and(eq(videos.channelId, channelId), eq(videos.userId, userId)));

    // 5. 删除用户创建的与该频道关联的角色
    await db
      .delete(characters)
      .where(and(eq(characters.channelId, channelId), eq(characters.userId, userId)));

    // 6. 删除用户与频道的关联
    await db
      .delete(userChannels)
      .where(and(eq(userChannels.channelId, channelId), eq(userChannels.userId, userId)));

    return { success: true };
  } catch (error) {
    console.error('删除频道失败:', error);
    return { success: false, message: '删除失败，请重试' };
  }
}
