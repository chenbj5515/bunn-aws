/**
 * 字幕提取 Prompt
 */
export function getSubtitlesPrompt(): string {
  return `识别图片底部区域的字幕内容。

规则：
- 只提取实际的字幕文本
- 忽略 YouTube 品牌名、播放控制按钮、视频标题等 UI 元素

返回 JSON 格式：
- subtitles: 识别到的字幕文本，未识别到时为 null
- reason: subtitles 为 null 时的原因（如"图片中没有字幕"、"图片模糊无法识别"等）

只返回 JSON，不要任何其他内容。`;
}

/**
 * 字幕识别结果
 * - ok: 成功时带 subtitles
 * - 失败时带 kind，由 router 映射为 errorCode
 */
export type SubtitleResult =
  | { ok: true; subtitles: string }
  | { ok: false; kind: 'parse_failed' | 'format_invalid' | 'no_content' | 'too_long' };

export const MAX_SUBTITLE_LENGTH = 200;

/** 将 kind 映射为 errorCode（供 router 使用） */
export function subtitleKindToErrorCode(kind: 'parse_failed' | 'format_invalid' | 'no_content' | 'too_long'): number {
  const map = { parse_failed: 3101, format_invalid: 3102, no_content: 3103, too_long: 3104 } as const;
  return map[kind];
}

/**
 * 处理字幕识别结果
 */
export function processSubtitlesContent(rawContent: string): SubtitleResult {
  const content = rawContent.trim();

  try {
    const jsonStr = content.replace(/^```json?\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    if (typeof parsed.subtitles !== 'string' && parsed.subtitles !== null) {
      return { ok: false, kind: 'format_invalid' };
    }

    if (parsed.subtitles && parsed.subtitles.length > MAX_SUBTITLE_LENGTH) {
      return { ok: false, kind: 'too_long' };
    }

    if (parsed.subtitles) {
      return { ok: true, subtitles: parsed.subtitles };
    }
    return { ok: false, kind: 'no_content' };
  } catch {
    return { ok: false, kind: 'parse_failed' };
  }
}
