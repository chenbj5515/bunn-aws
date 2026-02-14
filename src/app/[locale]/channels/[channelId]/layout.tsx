import { redirect } from 'next/navigation';
import { db } from '@/lib/db/index';
import { videos } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { getSession, getUserSettings } from '@/lib/auth';
import { getChannelDetail } from '../_data/get-channel-detail';
import { ChannelProvider } from './_components/channel-provider';
import type { VideoInfo } from './_store/types';

// ============================================
// 数据获取函数
// ============================================

/**
 * 获取视频列表
 */
async function fetchVideosList(channelId: string, userId: string): Promise<VideoInfo[]> {
  const rawVideos = await db
    .select({ videoId: videos.videoId, videoTitle: videos.videoTitle })
    .from(videos)
    .where(and(eq(videos.channelId, channelId), eq(videos.userId, userId)))
    .orderBy(asc(videos.createTime));

  return rawVideos.map((v) => ({
    videoId: v.videoId,
    videoTitle: v.videoTitle || 'Unknown Video',
  }));
}

/**
 * 检查用户是否有问答入口资格
 */
async function checkQuestionEntryEligibility(userId: string): Promise<boolean> {
  const settings = await getUserSettings(userId);
  const accuracy =
    settings.totalAnswersCount > 0
      ? (settings.correctAnswersCount / settings.totalAnswersCount) * 100
      : 0;
  return accuracy >= 95 && settings.totalAnswersCount > 12;
}

// ============================================
// Layout 组件
// ============================================

export default async function ChannelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; channelId: string }>;
}) {
  // 解析参数
  const { locale, channelId: encodedChannelId } = await params;
  const channelId = decodeURIComponent(encodedChannelId);

  // 验证用户
  const session = await getSession();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  // 并行获取频道级别的共享数据
  const [videosList, channelDetail, eligibleForQuestionEntry] = await Promise.all([
    fetchVideosList(channelId, session.user.id),
    getChannelDetail(channelId, session.user.id),
    checkQuestionEntryEligibility(session.user.id),
  ]);

  return (
    <ChannelProvider
      channelDetail={channelDetail}
      videosList={videosList}
      eligibleForQuestionEntry={eligibleForQuestionEntry}
    >
      {children}
    </ChannelProvider>
  );
}
