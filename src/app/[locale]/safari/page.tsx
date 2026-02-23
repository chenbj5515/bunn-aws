import { db } from '@/lib/db/index';
import { videos, user } from '@/lib/db/schema';
import { sql, notInArray, and, inArray, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { USER_DISLIKED_VIDEOS_KEY } from '@/constants/redis-keys';
import Cards from './cards';

export interface SafariPageProps {
  params: Promise<{
    locale: string;
  }>;
}

/**
 * 生成 YouTube 视频封面 URL
 */
function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export default async function SafariPage({ params }: SafariPageProps) {
  const { locale } = await params;

  // 从 user 表获取 role 为 admin 的用户 ID
  const adminUsers = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, 'admin'));
  
  const adminIds = adminUsers.map(u => u.id);

  // 如果没有管理员用户，返回空列表
  if (adminIds.length === 0) {
    return <Cards videos={[]} isAdmin={false} />;
  }

  // 获取当前用户会话
  const session = await getSession();
  const currentUserId = session?.user?.id;
  const isAdmin = currentUserId !== undefined && adminIds.includes(currentUserId);

  let adminVideos;

  if (isAdmin && currentUserId) {
    // 如果当前用户是 admin，直接获取当前用户的所有视频，不做任何过滤
    adminVideos = await db
      .select({
        videoId: videos.videoId,
        videoTitle: videos.videoTitle,
        channelId: videos.channelId,
        createTime: videos.createTime,
      })
      .from(videos)
      .where(eq(videos.userId, currentUserId))
      .orderBy(sql`RANDOM()`)
      .limit(24);
  } else {
    // 非 admin 用户：获取用户不喜欢视频列表
    let dislikedVideoIds: string[] = [];
    if (currentUserId) {
      try {
        const dislikedVideosData = await redis.get(USER_DISLIKED_VIDEOS_KEY(currentUserId));
        if (dislikedVideosData && typeof dislikedVideosData === 'string') {
          dislikedVideoIds = JSON.parse(dislikedVideosData);
        } else if (Array.isArray(dislikedVideosData)) {
          dislikedVideoIds = dislikedVideosData;
        }
      } catch (error) {
        console.error('获取用户不喜欢视频列表失败:', error);
      }
    }

    // 获取当前用户已有的视频 ID 列表（用于排除）
    let userVideoIds: string[] = [];
    if (currentUserId) {
      const userVideos = await db
        .select({ videoId: videos.videoId })
        .from(videos)
        .where(eq(videos.userId, currentUserId));
      userVideoIds = userVideos.map(v => v.videoId);
    }

    // 查询管理员的视频
    const conditions = [
      inArray(videos.userId, adminIds),
    ];

    // 如果当前用户已登录，过滤掉用户已有的视频
    if (userVideoIds.length > 0) {
      conditions.push(notInArray(videos.videoId, userVideoIds));
    }

    // 如果用户有不喜欢视频列表，添加过滤条件
    if (dislikedVideoIds.length > 0) {
      conditions.push(notInArray(videos.videoId, dislikedVideoIds));
    }

    adminVideos = await db
      .select({
        videoId: videos.videoId,
        videoTitle: videos.videoTitle,
        channelId: videos.channelId,
        createTime: videos.createTime,
      })
      .from(videos)
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(24);
  }

  // 使用 YouTube 默认封面格式
  const videosWithThumbnail = adminVideos.map(video => ({
    ...video,
    thumbnailUrl: getYouTubeThumbnailUrl(video.videoId),
  }));

  return <Cards videos={videosWithThumbnail} isAdmin={isAdmin} />;
}