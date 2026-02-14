import { redirect } from 'next/navigation';
import { db } from '@/lib/db/index';
import { videos } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

// ============================================
// 数据获取函数
// ============================================

/**
 * 获取频道的第一个视频 ID
 */
async function getFirstVideoId(channelId: string, userId: string): Promise<string | null> {
  const result = await db
    .select({ videoId: videos.videoId })
    .from(videos)
    .where(and(eq(videos.channelId, channelId), eq(videos.userId, userId)))
    .orderBy(asc(videos.createTime))
    .limit(1);

  return result[0]?.videoId || null;
}

// ============================================
// 页面组件
// ============================================

/**
 * 频道页面 - 重定向到第一个视频
 */
export default async function ChannelPage({
  params,
}: {
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

  // 获取第一个视频
  const firstVideoId = await getFirstVideoId(channelId, session.user.id);

  // 如果有视频，重定向到第一个视频
  if (firstVideoId) {
    redirect(`/${locale}/channels/${encodeURIComponent(channelId)}/${encodeURIComponent(firstVideoId)}`);
  }

  // 如果没有视频，重定向回频道列表
  // TODO: 可以考虑显示一个 "暂无视频" 的页面
  redirect(`/${locale}/channels`);
}
