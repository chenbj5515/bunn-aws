import { redirect } from 'next/navigation';
import { db } from '@/lib/db/index';
import { memoCard, videos, user } from '@/lib/db/schema';
import { and, eq, asc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { MusicViewerClient } from './_components/music-viewer-client';
import type { WordSegmentationV2 } from '@/types/extended-memo-card';

export interface LyricLine {
  id: string;
  originalText: string;
  translation: Record<string, string> | string;
  contextUrl: string | null;
  endTimeMs: number | null;
  wordSegmentation: WordSegmentationV2 | null;
}

/**
 * 获取歌词数据（从管理员用户的 memoCard 中获取）
 */
async function fetchLyrics(videoId: string): Promise<LyricLine[]> {
  const lyrics = await db
    .select({
      id: memoCard.id,
      originalText: memoCard.originalText,
      translation: memoCard.translation,
      contextUrl: memoCard.contextUrl,
      endTimeMs: memoCard.endTimeMs,
      wordSegmentation: memoCard.wordSegmentation,
    })
    .from(memoCard)
    .innerJoin(user, eq(memoCard.userId, user.id))
    .where(
      and(
        eq(memoCard.videoId, videoId),
        eq(memoCard.platform, 'music'),
        eq(user.role, 'admin')
      )
    )
    .orderBy(asc(memoCard.createTime));

  return lyrics.map((l) => ({
    id: l.id,
    originalText: l.originalText,
    translation: l.translation as Record<string, string> | string,
    contextUrl: l.contextUrl,
    endTimeMs: l.endTimeMs,
    wordSegmentation: l.wordSegmentation as WordSegmentationV2 | null,
  }));
}

/**
 * 获取音乐视频信息
 */
async function fetchMusicVideo(videoId: string): Promise<{
  videoTitle: string | null;
  adminUserId: string;
} | null> {
  const result = await db
    .select({
      videoTitle: videos.videoTitle,
      userId: videos.userId,
    })
    .from(videos)
    .innerJoin(user, eq(videos.userId, user.id))
    .where(and(eq(videos.videoId, videoId), eq(videos.isMusic, true), eq(user.role, 'admin')))
    .limit(1);

  if (!result[0]) return null;

  return {
    videoTitle: result[0].videoTitle,
    adminUserId: result[0].userId,
  };
}

export default async function MusicVideoPage({
  params,
}: {
  params: Promise<{ locale: string; videoId: string }>;
}) {
  const { locale, videoId: encodedVideoId } = await params;
  const videoId = decodeURIComponent(encodedVideoId);

  const session = await getSession();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const [musicVideo, lyrics] = await Promise.all([
    fetchMusicVideo(videoId),
    fetchLyrics(videoId),
  ]);

  if (!musicVideo) {
    redirect(`/${locale}/music`);
  }

  return (
    <MusicViewerClient
      videoId={videoId}
      videoTitle={musicVideo.videoTitle}
      lyrics={lyrics}
      adminUserId={musicVideo.adminUserId}
    />
  );
}
