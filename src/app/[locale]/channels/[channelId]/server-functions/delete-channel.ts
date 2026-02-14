'use server';

import { db } from '@/lib/db/index';
import { channels, userChannels, videos, memoCard } from '@/lib/db/schema';
import { and, eq, ne } from 'drizzle-orm';
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

      return { success: true, channelDeleted: true };
    }

    // 有多个视频，只删除当前视频
    await db
      .delete(videos)
      .where(
        and(
          eq(videos.videoId, currentVideoId),
          eq(videos.channelId, channelId),
          eq(videos.userId, userId)
        )
      );

    // 删除该视频关联的记忆卡片
    await db
      .delete(memoCard)
      .where(
        and(
          eq(memoCard.videoId, currentVideoId),
          eq(memoCard.channelId, channelId),
          eq(memoCard.userId, userId)
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
