import { redirect } from 'next/navigation';
import { db } from '@/lib/db/index';
import { memoCard, videos } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { getSession, getUserSettings } from '@/lib/auth';
import { VideoViewerClient } from './_components/video-viewer-client';
import { getChannelDetail } from '../_data/get-channel-detail';
import type { MemoCardWithChannel, VideoInfo } from './_store/types';

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
 * 获取频道下所有视频的记忆卡片数据
 */
async function fetchMemoCards(
  channelId: string,
  userId: string
): Promise<MemoCardWithChannel[]> {
  const memoCardsData = await db
    .select({
      id: memoCard.id,
      highlightSentenceId: memoCard.highlightSentenceId,
      translation: memoCard.translation,
      createTime: memoCard.createTime,
      updateTime: memoCard.updateTime,
      recordFilePath: memoCard.recordFilePath,
      originalText: memoCard.originalText,
      reviewTimes: memoCard.reviewTimes,
      forgetCount: memoCard.forgetCount,
      userId: memoCard.userId,
      lastCorrectTime: memoCard.lastCorrectTime,
      lastWrongTime: memoCard.lastWrongTime,
      kanaPronunciation: memoCard.kanaPronunciation,
      contextUrl: memoCard.contextUrl,
      rubyTranslations: memoCard.rubyTranslations,
      platform: memoCard.platform,
      seriesId: memoCard.seriesId,
      characterId: memoCard.characterId,
      bookId: memoCard.bookId,
      wordSegmentation: memoCard.wordSegmentation,
      contextInfo: memoCard.contextInfo,
      adminPreTranslations: memoCard.adminPreTranslations,
      avatarUrl: memoCard.avatarUrl,
      question: memoCard.question,
      questionType: memoCard.questionType,
      hasQuestionAnswerSubmission: memoCard.hasQuestionAnswerSubmission,
      questionAnswerSubmissions: memoCard.questionAnswerSubmissions,
      lastQuestionAnswerSubmittedAt: memoCard.lastQuestionAnswerSubmittedAt,
      channelId: memoCard.channelId!,
      thumbnailUrl: videos.thumbnailUrl,
      videoId: videos.videoId,
      videoTitle: videos.videoTitle,
    })
    .from(memoCard)
    .innerJoin(
      videos,
      and(eq(memoCard.videoId, videos.videoId), eq(videos.userId, userId))
    )
    .where(
      and(
        eq(videos.channelId, channelId),
        eq(memoCard.userId, userId),
        eq(memoCard.platform, 'youtube')
      )
    )
    .orderBy(memoCard.createTime);

  return memoCardsData.map((card) => ({
    ...card,
    channelId: card.channelId!,
    translation: card.translation as Record<string, string> | string,
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
// 页面组件
// ============================================

export default async function ChannelViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; channelId: string }>;
  searchParams: Promise<{ videoId: string; videoTitle: string }>;
}) {
  // 解析参数
  const { locale, channelId: encodedChannelId } = await params;
  const channelId = decodeURIComponent(encodedChannelId);
  const sp = await searchParams;

  // 验证用户
  const session = await getSession();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  // 获取视频列表
  const videosList = await fetchVideosList(channelId, session.user.id);

  // 确定当前视频
  let currentVideoId = sp.videoId || '';
  const currentVideoTitle = sp.videoTitle || null;
  if (!currentVideoId && videosList.length > 0) {
    currentVideoId = videosList[0]!.videoId;
  }

  // 并行获取频道详情、记忆卡片和问答入口资格
  const [channelDetail, memoCardsData, eligibleForQuestionEntry] = await Promise.all([
    getChannelDetail(channelId, session.user.id),
    fetchMemoCards(channelId, session.user.id),
    checkQuestionEntryEligibility(session.user.id),
  ]);

  return (
    <VideoViewerClient
      channelDetail={channelDetail}
      memoCardList={memoCardsData}
      initialVideoId={currentVideoId}
      initialVideoTitle={currentVideoTitle}
      videosList={videosList}
      eligibleForQuestionEntry={eligibleForQuestionEntry}
    />
  );
}
