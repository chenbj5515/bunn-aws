import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db/index';
import { videos, user } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { MusicProvider } from './_components/music-provider';

export interface MusicVideoInfo {
  videoId: string;
  videoTitle: string;
}

/**
 * 获取所有音乐视频列表（从管理员用户的数据中获取）
 */
async function fetchMusicVideosList(fallbackTitle: string): Promise<MusicVideoInfo[]> {
  const rawVideos = await db
    .select({ videoId: videos.videoId, videoTitle: videos.videoTitle })
    .from(videos)
    .innerJoin(user, eq(videos.userId, user.id))
    .where(and(eq(videos.isMusic, true), eq(user.role, 'admin')))
    .orderBy(asc(videos.createTime));

  return rawVideos.map((v) => ({
    videoId: v.videoId,
    videoTitle: v.videoTitle || fallbackTitle,
  }));
}

/**
 * 检查用户是否为管理员
 */
async function checkIsAdmin(userId: string): Promise<boolean> {
  const result = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result[0]?.role === 'admin';
}

export default async function MusicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'music.common' });

  const session = await getSession();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const [musicVideosList, isAdmin] = await Promise.all([
    fetchMusicVideosList(t('unknownMusic')),
    checkIsAdmin(session.user.id),
  ]);

  return (
    <MusicProvider
      musicVideosList={musicVideosList}
      isAdmin={isAdmin}
      currentUserId={session.user.id}
    >
      {children}
    </MusicProvider>
  );
}
