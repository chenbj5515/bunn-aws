'use server';

import { db } from '@/lib/db/index';
import { userChannels } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

interface UpdateChannelNameResult {
  success: boolean;
  message?: string;
}

/**
 * 更新频道名称
 */
export async function updateChannelName(
  channelId: string,
  channelName: string
): Promise<UpdateChannelNameResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, message: '未授权' };
  }

  try {
    await db
      .update(userChannels)
      .set({ channelName })
      .where(
        and(
          eq(userChannels.channelId, channelId),
          eq(userChannels.userId, session.user.id)
        )
      );

    return { success: true };
  } catch (error) {
    console.error('更新频道名称失败:', error);
    return { success: false, message: '更新失败，请重试' };
  }
}
