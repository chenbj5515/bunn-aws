import { redirect } from 'next/navigation';
import { db } from '@/lib/db/index';
import { videos, user } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { EmptyMusicPage } from './_components/empty-music-page';

/**
 * 获取第一个音乐视频 ID（从管理员用户的数据中获取）
 */
async function getFirstMusicVideoId(): Promise<string | null> {
  const result = await db
    .select({ videoId: videos.videoId })
    .from(videos)
    .innerJoin(user, eq(videos.userId, user.id))
    .where(and(eq(videos.isMusic, true), eq(user.role, 'admin')))
    .orderBy(asc(videos.createTime))
    .limit(1);

  return result[0]?.videoId || null;
}

/**
 * 音乐主页面 - 重定向到第一个音乐视频
 */
export default async function MusicPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const session = await getSession();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const firstVideoId = await getFirstMusicVideoId();

  if (firstVideoId) {
    redirect(`/${locale}/music/${encodeURIComponent(firstVideoId)}`);
  }

  return <EmptyMusicPage />;
}
