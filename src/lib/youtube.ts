/**
 * YouTube URL 解析工具
 */

export interface ParsedYouTubeUrl {
  videoId: string | null;
  startSec?: number;
}

/**
 * 解析 YouTube URL，提取 videoId 和开始时间
 * 支持格式：
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID&t=120
 * - https://www.youtube.com/watch?v=VIDEO_ID&t=2m30s
 * - https://youtu.be/VIDEO_ID
 * - https://youtu.be/VIDEO_ID?t=120
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
export function parseYouTubeUrl(url: string): ParsedYouTubeUrl {
  if (!url) return { videoId: null };

  try {
    const parsed = new URL(url);
    let videoId: string | null = null;
    let startSec: number | undefined;

    // youtube.com/watch?v=VIDEO_ID
    if (parsed.hostname.includes('youtube.com') && parsed.pathname === '/watch') {
      videoId = parsed.searchParams.get('v');
    }
    // youtu.be/VIDEO_ID
    else if (parsed.hostname === 'youtu.be') {
      const pathId = parsed.pathname.slice(1).split('/')[0];
      videoId = pathId || null;
    }
    // youtube.com/embed/VIDEO_ID 或 youtube.com/v/VIDEO_ID
    else if (parsed.hostname.includes('youtube.com')) {
      const match = parsed.pathname.match(/^\/(embed|v)\/([^/?]+)/);
      if (match?.[2]) {
        videoId = match[2];
      }
    }

    // 解析时间参数
    const tParam = parsed.searchParams.get('t') || parsed.searchParams.get('start');
    if (tParam) {
      if (tParam.includes('m') || tParam.includes('s')) {
        const minutes = tParam.match(/(\d+)m/)?.[1] || '0';
        const seconds = tParam.match(/(\d+)s/)?.[1] || '0';
        startSec = parseInt(minutes) * 60 + parseInt(seconds);
      } else {
        startSec = parseInt(tParam) || undefined;
      }
    }

    return { videoId, startSec };
  } catch {
    return { videoId: null };
  }
}
