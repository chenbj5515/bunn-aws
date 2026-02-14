"use server";

import { db } from "@/lib/db/index";
import { videos, channels, userChannels } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

interface YouTubeVideoSnippet {
  title: string;
  channelId: string;
  channelTitle: string;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
  };
}

interface YouTubeVideoItem {
  id: string;
  snippet: YouTubeVideoSnippet;
}

interface YouTubeApiResponse {
  items: YouTubeVideoItem[];
}

interface YouTubeChannelSnippet {
  title: string;
  customUrl?: string;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
  };
}

interface YouTubeChannelItem {
  id: string;
  snippet: YouTubeChannelSnippet;
}

interface YouTubeChannelApiResponse {
  items: YouTubeChannelItem[];
}

export type GetYouTubeVideoInfoResult =
  | { success: true; videoId: string; title: string; channelId: string; channelTitle: string; channelAvatarUrl: string | null }
  | { success: false; error: string };

/**
 * 通过 YouTube Data API 获取视频信息（标题、频道等）
 * @param videoId YouTube 视频 ID
 */
export async function getYouTubeVideoInfo(videoId: string): Promise<GetYouTubeVideoInfoResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_API_KEY not configured");
    return { success: false, error: "API key not configured" };
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}&key=${apiKey}`,
      { headers: { Accept: "application/json" } }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("YouTube API error:", response.status, errorText);
      return { success: false, error: "获取视频信息失败" };
    }

    const data: YouTubeApiResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      return { success: false, error: "视频不存在" };
    }

    const video = data.items[0];
    if (!video) {
      return { success: false, error: "视频数据无效" };
    }

    const snippet = video.snippet;

    // 获取频道信息（含 handle、头像）
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(snippet.channelId)}&key=${apiKey}`,
      { headers: { Accept: "application/json" } }
    );

    let channelId = snippet.channelId;
    let channelTitle = snippet.channelTitle;
    let channelAvatarUrl: string | null = null;

    if (channelResponse.ok) {
      const channelData: YouTubeChannelApiResponse = await channelResponse.json();
      if (channelData.items && channelData.items.length > 0) {
        const channel = channelData.items[0];
        const channelSnippet = channel.snippet;
        if (channelSnippet.customUrl) {
          channelId = channelSnippet.customUrl.startsWith("@") ? channelSnippet.customUrl : `@${channelSnippet.customUrl}`;
        }
        channelTitle = channelSnippet.title;
        channelAvatarUrl =
          channelSnippet.thumbnails.high?.url ??
          channelSnippet.thumbnails.medium?.url ??
          channelSnippet.thumbnails.default?.url ??
          null;
      }
    }

    return {
      success: true,
      videoId: video.id,
      title: snippet.title,
      channelId,
      channelTitle,
      channelAvatarUrl,
    };
  } catch (error) {
    console.error("Error fetching YouTube video info:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 添加新视频记录
 * @param videoId YouTube视频ID
 * @param channelId 频道ID
 * @param videoTitle 视频标题
 * @param channelTitle 频道标题（可选）
 * @param channelAvatarUrl 频道头像URL（可选）
 * @returns 添加结果
 */
export async function addVideo(
  videoId: string,
  channelId: string,
  videoTitle: string,
  channelTitle?: string | null,
  channelAvatarUrl?: string | null
): Promise<{ success: boolean; message?: string }> {
  try {
    // 1. 验证用户身份
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        message: "请先登录"
      };
    }

    // 2. 验证参数
    if (!videoId.trim()) {
      return {
        success: false,
        message: "视频ID不能为空"
      };
    }

    if (!channelId.trim()) {
      return {
        success: false,
        message: "频道ID不能为空"
      };
    }

    if (!videoTitle.trim()) {
      return {
        success: false,
        message: "视频标题不能为空"
      };
    }

    // 3. 检查视频是否已存在
    const existingVideo = await db
      .select()
      .from(videos)
      .where(
        and(
          eq(videos.videoId, videoId.trim()),
          eq(videos.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingVideo.length > 0) {
      return {
        success: false,
        message: "该视频已存在"
      };
    }

    // 4. 确保频道存在
    await db
      .insert(channels)
      .values({
        channelId: channelId.trim(),
        channelName: channelTitle?.trim() || channelId.trim(), // 使用传入的频道名称，如果没有则退回到使用ID
        avatarUrl: channelAvatarUrl?.trim() || null, // 使用传入的头像URL
        createTime: sql`CURRENT_TIMESTAMP`,
        updateTime: sql`CURRENT_TIMESTAMP`,
      })
      .onConflictDoUpdate({
        target: channels.channelId,
        set: {
          channelName: channelTitle?.trim() || channelId.trim(),
          avatarUrl: channelAvatarUrl?.trim() || null,
          updateTime: sql`CURRENT_TIMESTAMP`,
        },
      });

    // 5. 确保用户-频道关联存在
    await db
      .insert(userChannels)
      .values({
        userId: session.user.id,
        channelId: channelId.trim(),
        createTime: sql`CURRENT_TIMESTAMP`,
        updateTime: sql`CURRENT_TIMESTAMP`,
      })
      .onConflictDoNothing();

    // 6. 插入新视频记录
    await db.insert(videos).values({
      videoId: videoId.trim(),
      userId: session.user.id,
      channelId: channelId.trim(),
      videoTitle: videoTitle.trim(),
    });

    return {
      success: true,
      message: "视频添加成功"
    };

  } catch (error) {
    console.error('添加视频失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '添加失败'
    };
  }
}