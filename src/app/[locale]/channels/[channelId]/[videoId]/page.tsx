import { redirect } from 'next/navigation';
import { db } from '@/lib/db/index';
import { memoCard, memoCardMessages, videos } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { VideoViewerClient } from '../_components/video-viewer-client';
import type { MemoCardWithChannel, MemoCardMessage } from '../_store/types';

// ============================================
// 数据获取函数
// ============================================

/**
 * 获取单个视频的记忆卡片数据（包含AI对话消息）
 * 优化：只获取当前视频的卡片，而不是整个频道
 */
async function fetchMemoCards(
  videoId: string,
  userId: string
): Promise<MemoCardWithChannel[]> {
  // 1. 获取当前视频的记忆卡片
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
        eq(memoCard.videoId, videoId),
        eq(memoCard.userId, userId),
        eq(memoCard.platform, 'youtube')
      )
    )
    .orderBy(memoCard.createTime);

  // 2. 批量获取所有卡片的 AI 对话消息
  const cardIds = memoCardsData.map((card) => card.id);
  let messagesMap = new Map<string, MemoCardMessage[]>();

  if (cardIds.length > 0) {
    const allMessages = await db
      .select({
        id: memoCardMessages.id,
        memoCardId: memoCardMessages.memoCardId,
        role: memoCardMessages.role,
        content: memoCardMessages.content,
        isInitialAnalysis: memoCardMessages.isInitialAnalysis,
        messageOrder: memoCardMessages.messageOrder,
      })
      .from(memoCardMessages)
      .where(inArray(memoCardMessages.memoCardId, cardIds))
      .orderBy(memoCardMessages.messageOrder);

    // 按 memoCardId 分组
    for (const msg of allMessages) {
      const cardMessages = messagesMap.get(msg.memoCardId) || [];
      cardMessages.push({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        isInitialAnalysis: msg.isInitialAnalysis,
      });
      messagesMap.set(msg.memoCardId, cardMessages);
    }
  }

  // 3. 合并卡片数据和消息
  return memoCardsData.map((card) => ({
    ...card,
    channelId: card.channelId!,
    translation: card.translation as Record<string, string> | string,
    messages: messagesMap.get(card.id) || [],
  }));
}

/**
 * 获取视频标题
 */
async function fetchVideoTitle(videoId: string, userId: string): Promise<string | null> {
  const result = await db
    .select({ videoTitle: videos.videoTitle })
    .from(videos)
    .where(and(eq(videos.videoId, videoId), eq(videos.userId, userId)))
    .limit(1);
  
  return result[0]?.videoTitle || null;
}

// ============================================
// 页面组件
// ============================================

/**
 * 视频详情页
 * 注意：videosList、channelDetail、eligibleForQuestionEntry 由 layout.tsx 通过 ChannelProvider 提供
 */
export default async function VideoViewerPage({
  params,
}: {
  params: Promise<{ locale: string; channelId: string; videoId: string }>;
}) {
  // 解析参数
  const { locale, videoId: encodedVideoId } = await params;
  const videoId = decodeURIComponent(encodedVideoId);

  // 验证用户
  const session = await getSession();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  // 只获取当前视频的数据
  const [memoCardsData, videoTitle] = await Promise.all([
    fetchMemoCards(videoId, session.user.id),
    fetchVideoTitle(videoId, session.user.id),
  ]);

  console.log(memoCardsData, "memoCardsData========")

  return (
    <VideoViewerClient
      memoCardList={memoCardsData}
      initialVideoId={videoId}
      initialVideoTitle={videoTitle}
    />
  );
}
