'use server';

import { getSession } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { USER_DISLIKED_VIDEOS_KEY } from '@/constants/redis-keys';

export async function handleDislikeOrDeleteVideo(videoId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, message: '未登录' };
    }

    const userId = session.user.id;
    const key = USER_DISLIKED_VIDEOS_KEY(userId);

    // 获取当前不喜欢的视频列表
    let dislikedVideos: string[] = [];
    const existing = await redis.get(key);
    if (existing && typeof existing === 'string') {
      dislikedVideos = JSON.parse(existing);
    } else if (Array.isArray(existing)) {
      dislikedVideos = existing;
    }

    // 添加新的视频 ID（如果不存在）
    if (!dislikedVideos.includes(videoId)) {
      dislikedVideos.push(videoId);
      await redis.set(key, JSON.stringify(dislikedVideos));
    }

    return { success: true };
  } catch (error) {
    console.error('处理不喜欢视频失败:', error);
    return { success: false, message: '操作失败' };
  }
}
