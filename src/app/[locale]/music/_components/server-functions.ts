'use server';

import { db } from '@/lib/db/index';
import { videos, user } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { eq, and, sql } from 'drizzle-orm';

async function checkIsAdmin(userId: string): Promise<boolean> {
  const result = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result[0]?.role === 'admin';
}

export async function addMusicVideo(
  videoId: string,
  videoTitle: string
): Promise<{
  success: boolean;
  messageKey?:
    | 'loginRequired'
    | 'noPermission'
    | 'videoIdRequired'
    | 'videoTitleRequired'
    | 'videoAlreadyExists'
    | 'addFailed';
}> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, messageKey: 'loginRequired' };
    }

    const isAdmin = await checkIsAdmin(session.user.id);
    if (!isAdmin) {
      return { success: false, messageKey: 'noPermission' };
    }

    if (!videoId.trim()) {
      return { success: false, messageKey: 'videoIdRequired' };
    }

    if (!videoTitle.trim()) {
      return { success: false, messageKey: 'videoTitleRequired' };
    }

    const existingVideo = await db
      .select()
      .from(videos)
      .where(
        and(
          eq(videos.videoId, videoId.trim()),
          eq(videos.userId, session.user.id),
          eq(videos.isMusic, true)
        )
      )
      .limit(1);

    if (existingVideo.length > 0) {
      return { success: false, messageKey: 'videoAlreadyExists' };
    }

    await db.insert(videos).values({
      videoId: videoId.trim(),
      userId: session.user.id,
      videoTitle: videoTitle.trim(),
      isMusic: true,
      createTime: sql`CURRENT_TIMESTAMP`,
      updateTime: sql`CURRENT_TIMESTAMP`,
    });

    return { success: true };
  } catch (error) {
    console.error('添加音乐视频失败:', error);
    return {
      success: false,
      messageKey: 'addFailed',
    };
  }
}
