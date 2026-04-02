import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db/index';
import { memoCard, user, videos } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getSegmentationPrompt, processSegmentationContent } from '@/prompts';
import type { WordSegmentationV2 } from '@/types/extended-memo-card';

const SEGMENTATION_MODEL = 'gpt-4o';
const BATCH_SIZE = 5;

async function checkIsAdmin(userId: string): Promise<boolean> {
  const result = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result[0]?.role === 'admin';
}

async function segmentText(text: string): Promise<WordSegmentationV2 | null> {
  try {
    const result = await generateText({
      model: openai(SEGMENTATION_MODEL),
      messages: [{ role: 'user', content: getSegmentationPrompt(text) }],
      temperature: 0.7,
    });
    return processSegmentationContent(result.text, SEGMENTATION_MODEL);
  } catch (error) {
    console.error('Segmentation error:', error);
    return null;
  }
}

interface LyricInput {
  originalText: string;
  translation: Record<string, string>;
  startTimeMs: number;
  endTimeMs: number;
  wordSegmentation?: WordSegmentationV2 | null;
}

async function resolveWordSegmentations(
  lyrics: LyricInput[]
): Promise<(WordSegmentationV2 | null)[]> {
  const results = lyrics.map((lyric) => lyric.wordSegmentation ?? null);
  const pendingLyrics = lyrics
    .map((lyric, index) => ({ lyric, index }))
    .filter(({ lyric }) => !lyric.wordSegmentation);

  for (let i = 0; i < pendingLyrics.length; i += BATCH_SIZE) {
    const batch = pendingLyrics.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(({ lyric }) => segmentText(lyric.originalText))
    );

    batch.forEach(({ index }, batchIndex) => {
      results[index] = batchResults[batchIndex];
    });
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const isAdmin = await checkIsAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { videoId, lyrics } = body as { videoId: string; lyrics: LyricInput[] };

    if (!videoId || !lyrics || !Array.isArray(lyrics)) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }

    const videoExists = await db
      .select({ videoId: videos.videoId })
      .from(videos)
      .where(and(eq(videos.videoId, videoId), eq(videos.userId, session.user.id)))
      .limit(1);

    if (videoExists.length === 0) {
      await db.insert(videos).values({
        videoId,
        userId: session.user.id,
        isMusic: true,
        createTime: sql`CURRENT_TIMESTAMP`,
        updateTime: sql`CURRENT_TIMESTAMP`,
      });
    }

    await db
      .delete(memoCard)
      .where(
        and(
          eq(memoCard.videoId, videoId),
          eq(memoCard.userId, session.user.id),
          eq(memoCard.platform, 'music')
        )
      );

    const segmentations = await resolveWordSegmentations(lyrics);

    const insertedLyrics = [];

    for (let i = 0; i < lyrics.length; i++) {
      const lyric = lyrics[i];
      const wordSegmentation = segmentations[i];
      const startTimeSec = Math.floor(lyric.startTimeMs / 1000);
      const contextUrl = `https://www.youtube.com/watch?v=${videoId}&t=${startTimeSec}`;

      const [inserted] = await db
        .insert(memoCard)
        .values({
          originalText: lyric.originalText,
          translation: lyric.translation,
          wordSegmentation,
          contextUrl,
          endTimeMs: lyric.endTimeMs,
          videoId,
          userId: session.user.id,
          platform: 'music',
          createTime: sql`CURRENT_TIMESTAMP`,
          updateTime: sql`CURRENT_TIMESTAMP`,
        })
        .returning({
          id: memoCard.id,
          originalText: memoCard.originalText,
          translation: memoCard.translation,
          contextUrl: memoCard.contextUrl,
          endTimeMs: memoCard.endTimeMs,
          wordSegmentation: memoCard.wordSegmentation,
        });

      insertedLyrics.push(inserted);
    }

    return NextResponse.json({ lyrics: insertedLyrics });
  } catch (error) {
    console.error('Save lyrics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: '缺少 videoId 参数' }, { status: 400 });
    }

    const adminResult = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.role, 'admin'))
      .limit(1);

    if (!adminResult[0]) {
      return NextResponse.json({ lyrics: [] });
    }

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
      .where(
        and(
          eq(memoCard.videoId, videoId),
          eq(memoCard.userId, adminResult[0].id),
          eq(memoCard.platform, 'music')
        )
      )
      .orderBy(memoCard.createTime);

    return NextResponse.json({ lyrics });
  } catch (error) {
    console.error('Get lyrics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取歌词失败' },
      { status: 500 }
    );
  }
}
