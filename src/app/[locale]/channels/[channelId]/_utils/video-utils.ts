import { parseYouTubeUrl } from '@/lib/youtube';
import type { MemoCardWithChannel, Marker, ChannelDetail } from '../_store/types';

// 重新导出供其他模块使用
export { parseYouTubeUrl };

/**
 * 从 contextUrl 解析视频开始时间
 */
export function parseVideoStartTime(contextUrl: string | null): number {
  if (!contextUrl) return 0;
  return parseYouTubeUrl(contextUrl).startSec || 0;
}

/**
 * 移除 YouTube URL 中的时间参数
 */
export function removeTimeParams(url: string): string {
  if (!url.includes('youtube.com/watch') && !url.includes('youtu.be/')) {
    return url;
  }

  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('t');
    parsed.searchParams.delete('start');
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * 构建视频 URL
 */
export function buildVideoUrl(
  videoId: string,
  memoCards: MemoCardWithChannel[],
  channelUrl: string
): string {
  const firstCard = memoCards.find(c => c.videoId === videoId);
  const originalUrl = firstCard?.contextUrl || 
    (videoId ? `https://www.youtube.com/watch?v=${videoId}` : channelUrl);
  
  return removeTimeParams(originalUrl);
}

/**
 * 解析播放器视频 ID
 */
export function parsePlayerVideoId(videoUrl: string, fallbackId: string): string {
  try {
    const { videoId } = parseYouTubeUrl(videoUrl || '');
    return videoId || fallbackId;
  } catch {
    return fallbackId;
  }
}

/**
 * 生成视频标记列表
 */
export function generateMarkers(
  memoCards: MemoCardWithChannel[],
  currentVideoId: string,
  channelDetail: ChannelDetail | null
): Marker[] {
  const list = memoCards.filter(c => c.videoId === currentVideoId);
  
  return list.map((c, idx) => ({
    id: c.id,
    contextUrl: c.contextUrl || channelDetail?.channelUrl || '',
    avatarUrl: c.avatarUrl || channelDetail?.avatarUrl,
    title: c.originalText || '',
    order: idx,
  }));
}

/**
 * 过滤视频列表
 */
export function filterVideosByText<T extends { videoTitle: string | null }>(
  videos: T[],
  searchText: string
): T[] {
  if (!searchText.trim()) {
    return videos;
  }
  
  const query = searchText.toLowerCase().trim();
  return videos.filter(v => (v.videoTitle || '').toLowerCase().includes(query));
}

/**
 * 查找下一个视频
 */
export function findNextVideo<T extends { videoId: string }>(
  videos: T[],
  currentVideoId: string
): T | null {
  return videos.find(v => v.videoId !== currentVideoId) || videos[0] || null;
}
