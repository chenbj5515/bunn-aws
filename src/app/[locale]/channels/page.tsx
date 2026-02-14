import { ChannelsClient, type Channel, type ChannelPosition } from './_components/channels-client';
import { db } from '@/lib/db/index';
import { channels, userChannels, videos } from '@/lib/db/schema';
import { asc, eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// ============================================
// 类型定义
// ============================================

export interface ChannelsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

// ============================================
// 数据获取函数
// ============================================

/**
 * 获取保存的位置数据
 */
async function fetchSavedPositions(): Promise<Record<string, ChannelPosition>> {
  try {
    const cookieStore = await cookies();
    const savedPositionsCookie = cookieStore.get('channel_positions');
    if (savedPositionsCookie?.value) {
      return JSON.parse(savedPositionsCookie.value);
    }
  } catch (error) {
    console.error('Failed to get or parse saved positions from cookie:', error);
  }
  return {};
}

/**
 * 获取频道数据
 */
async function fetchChannelsData(userId: string): Promise<Channel[]> {
  const channelsData = await db
    .select({
      channelId: channels.channelId,
      channelNameFromChannel: channels.channelName,
      channelNameFromUserChannel: userChannels.channelName,
      avatarUrlFromChannel: channels.avatarUrl,
      avatarUrlFromUserChannel: userChannels.avatarUrl,
      bannerUrlFromChannel: channels.bannerUrl,
      bannerUrlFromUserChannel: userChannels.bannerUrl,
    })
    .from(userChannels)
    .innerJoin(channels, eq(userChannels.channelId, channels.channelId))
    .where(eq(userChannels.userId, userId));

  // 获取每个频道的第一个视频
  const firstVideoByChannel = await fetchFirstVideos(channelsData.map(c => c.channelId), userId);

  return channelsData.map((item) => ({
    channelId: item.channelId,
    channelName: item.channelNameFromUserChannel || item.channelNameFromChannel,
    avatarUrl: item.avatarUrlFromUserChannel || item.avatarUrlFromChannel,
    bannerUrl: item.bannerUrlFromUserChannel || item.bannerUrlFromChannel,
    firstVideoId: firstVideoByChannel[item.channelId] ?? null,
  }));
}

/**
 * 获取每个频道的第一个视频
 */
async function fetchFirstVideos(
  channelIds: string[],
  userId: string
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};

  for (const channelId of channelIds) {
    if (result[channelId] !== undefined) continue;
    const first = await db
      .select({ videoId: videos.videoId })
      .from(videos)
      .where(and(eq(videos.channelId, channelId), eq(videos.userId, userId)))
      .orderBy(asc(videos.createTime))
      .limit(1);
    result[channelId] = first.length > 0 ? first[0]!.videoId : null;
  }

  return result;
}

// ============================================
// 页面组件
// ============================================

export default async function ({ params }: ChannelsPageProps) {
  const { locale } = await params;

  // 验证用户
  const session = await getSession();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  // 并行获取数据
  const [savedPositions, channelsList] = await Promise.all([
    fetchSavedPositions(),
    fetchChannelsData(session.user.id).catch((error) => {
      console.error('Failed to fetch channels data:', error);
      return [];
    }),
  ]);

  // 如果没有频道，重定向到 getting-started 页
  if (channelsList.length === 0) {
    redirect(`/${locale}/getting-started`);
  }

  return <ChannelsClient channels={channelsList} savedPositions={savedPositions} />;
}
