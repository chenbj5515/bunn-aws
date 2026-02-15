'use server';

import { db } from '@/lib/db/index';
import { userChannels, videos, memoCard, wordCard, characters } from '@/lib/db/schema';
import { and, eq, ne, inArray } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

interface DeleteChannelResult {
  success: boolean;
  message?: string;
  channelDeleted?: boolean;
  nextVideoId?: string;
}

/**
 * 删除频道或视频
 * 如果只有一个视频，则删除整个频道
 * 如果有多个视频，则只删除当前视频
 * 
 * 删除顺序（从最底层开始）：
 * 1. wordCard - 关联到 memoCard，无 cascade，必须先删
 * 2. memoCard - 通过 channelId 关联（memoCardMessages 和 seriesMetadata 会 cascade 删除）
 * 3. videos - 关联到频道
 * 4. characters - 关联到频道的用户角色（仅删除整个频道时）
 * 5. userChannels - 用户与频道的关联（仅删除整个频道时）
 */
export async function deleteChannel(
  channelId: string,
  currentVideoId?: string
): Promise<DeleteChannelResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, message: '未授权' };
  }

  const userId = session.user.id;

  try {
    // 获取该频道下用户的所有视频
    const userVideos = await db
      .select({ videoId: videos.videoId })
      .from(videos)
      .where(and(eq(videos.channelId, channelId), eq(videos.userId, userId)));

    // 如果只有一个视频或没有指定当前视频，删除整个频道关联
    if (userVideos.length <= 1 || !currentVideoId) {
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

      return { success: true, channelDeleted: true };
    }

    // 有多个视频，只删除当前视频
    // 1. 获取该视频关联的记忆卡片 ID
    const videoMemoCards = await db
      .select({ id: memoCard.id })
      .from(memoCard)
      .where(
        and(
          eq(memoCard.videoId, currentVideoId),
          eq(memoCard.userId, userId)
        )
      );

    const videoMemoCardIds = videoMemoCards.map((m) => m.id);

    // 2. 删除关联到这些记忆卡片的单词卡片
    if (videoMemoCardIds.length > 0) {
      await db.delete(wordCard).where(inArray(wordCard.memoCardId, videoMemoCardIds));
    }

    // 3. 删除该视频关联的记忆卡片
    if (videoMemoCardIds.length > 0) {
      await db.delete(memoCard).where(inArray(memoCard.id, videoMemoCardIds));
    }

    // 4. 删除视频
    await db
      .delete(videos)
      .where(
        and(
          eq(videos.videoId, currentVideoId),
          eq(videos.channelId, channelId),
          eq(videos.userId, userId)
        )
      );

    // 获取下一个视频
    const remainingVideos = await db
      .select({ videoId: videos.videoId })
      .from(videos)
      .where(
        and(
          eq(videos.channelId, channelId),
          eq(videos.userId, userId),
          ne(videos.videoId, currentVideoId)
        )
      )
      .limit(1);

    const nextVideoId = remainingVideos.length > 0 ? remainingVideos[0]!.videoId : undefined;

    return { success: true, channelDeleted: false, nextVideoId };
  } catch (error) {
    console.error('删除频道/视频失败:', error);
    return { success: false, message: '删除失败，请重试' };
  }
}
