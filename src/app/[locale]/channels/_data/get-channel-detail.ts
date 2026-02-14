import { cache } from 'react';
import { db } from '@/lib/db/index';
import { channels, userChannels } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { ChannelDetail } from '../[channelId]/_store/types';

/**
 * 获取频道详情（带 React cache，同一请求周期内自动去重）
 */
export const getChannelDetail = cache(
  async (channelId: string, userId: string): Promise<ChannelDetail> => {
    const channelData = await db
      .select({
        channelId: channels.channelId,
        channelName: channels.channelName,
        channelNameFromUserChannel: userChannels.channelName,
        avatarUrl: channels.avatarUrl,
        avatarUrlFromUserChannel: userChannels.avatarUrl,
        description: channels.description,
        bannerUrl: channels.bannerUrl,
        bannerUrlFromUserChannel: userChannels.bannerUrl,
      })
      .from(channels)
      .leftJoin(
        userChannels,
        and(eq(userChannels.channelId, channels.channelId), eq(userChannels.userId, userId))
      )
      .where(eq(channels.channelId, channelId))
      .limit(1);

    const data = channelData[0]!;

    return {
      channelId: data.channelId,
      channelName: data.channelNameFromUserChannel || data.channelName,
      avatarUrl: data.avatarUrlFromUserChannel || data.avatarUrl,
      description: data.description,
      bannerUrl: data.bannerUrlFromUserChannel || data.bannerUrl,
      channelUrl: channelId.startsWith('@')
        ? `https://www.youtube.com/${channelId}`
        : `https://www.youtube.com/channel/${channelId}`,
    };
  }
);
