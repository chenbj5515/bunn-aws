import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db/index';
import { user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import {
  getSegmentationPrompt,
  getTranslationPrompt,
  processSegmentationContent,
  processTranslationContent,
} from '@/prompts';
import type { WordSegmentationV2 } from '@/types/extended-memo-card';

async function checkIsAdmin(userId: string): Promise<boolean> {
  const result = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result[0]?.role === 'admin';
}

const BATCH_SIZE = 5;

interface ProcessedLyricResult {
  translation: Record<string, string>;
  wordSegmentation: WordSegmentationV2 | null;
}

function getLocaleLabel(locale: string): string {
  switch (locale) {
    case 'en':
      return '英文';
    case 'zh-TW':
      return '繁体中文';
    case 'zh':
    default:
      return '简体中文';
  }
}

async function translateLyric(
  songTitle: string,
  lyricText: string
): Promise<Record<string, string>> {
  const prompt = `${getTranslationPrompt(lyricText)}

补充要求：
1. 结合歌曲《${songTitle}》的语境理解句子含义
2. 翻译要自然，不要生硬直译`;

  try {
    const result = await generateText({
      model: openai('gpt-4o-search-preview'),
      tools: {
        webSearch: openai.tools.webSearchPreview({
          searchContextSize: 'medium',
        }),
      },
      prompt,
    });

    return processTranslationContent(result.text, 'zh') as Record<string, string>;
  } catch (error) {
    console.error('Translation error for lyric:', lyricText, error);
    const fallbackResult = await generateText({
      model: openai('gpt-4o'),
      prompt,
    });
    return processTranslationContent(fallbackResult.text, 'zh') as Record<string, string>;
  }
}

async function regenerateLyricTranslation(
  songTitle: string,
  originalLyric: string,
  sourceText: string,
  sourceLocale: string
): Promise<Record<string, string>> {
  const localeLabel = getLocaleLabel(sourceLocale);
  const prompt = `你正在协助校对歌曲歌词的多语言翻译。

请基于用户确认后的歌词翻译，生成英文、简体中文和繁体中文三个版本，并返回 JSON：
{"en": "英文翻译", "zh": "简体中文翻译", "zh-TW": "繁體中文翻譯"}

已知信息：
- 歌曲名：${songTitle}
- 原歌词：${originalLyric}
- 用户确认的${localeLabel}翻译：${sourceText}

要求：
1. 必须以用户确认的这条翻译为准，其他语言围绕它保持语义一致
2. 可参考原歌词和歌曲语境做自然润色，但不要偏离用户确认的含义
3. 如果用户确认的语言本身就是目标语言之一，对应字段应尽量贴近用户输入
4. 只返回 JSON，不要任何其他内容`;

  try {
    const result = await generateText({
      model: openai('gpt-4o'),
      prompt,
    });

    return processTranslationContent(result.text, sourceLocale) as Record<string, string>;
  } catch (error) {
    console.error('Regenerate translation error:', error);
    throw error;
  }
}

async function segmentLyric(lyricText: string): Promise<WordSegmentationV2 | null> {
  try {
    const result = await generateText({
      model: openai('gpt-4o'),
      messages: [{ role: 'user', content: getSegmentationPrompt(lyricText) }],
      temperature: 0.7,
    });

    return processSegmentationContent(result.text, 'gpt-4o');
  } catch (error) {
    console.error('Segmentation error for lyric:', lyricText, error);
    return null;
  }
}

async function processLyricsInBatches(
  lyrics: string[],
  songTitle: string
): Promise<ProcessedLyricResult[]> {
  const results: ProcessedLyricResult[] = [];

  for (let i = 0; i < lyrics.length; i += BATCH_SIZE) {
    const batch = lyrics.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (lyric) => {
        const [translation, wordSegmentation] = await Promise.all([
          translateLyric(songTitle, lyric),
          segmentLyric(lyric),
        ]);

        return {
          translation,
          wordSegmentation,
        };
      })
    );
    results.push(...batchResults);
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
    const { songTitle, lyrics, originalLyric, sourceLocale, translationText } = body;
    const trimmedTranslationText =
      typeof translationText === 'string' ? translationText.trim() : '';
    const trimmedOriginalLyric =
      typeof originalLyric === 'string' ? originalLyric.trim() : '';

    if (trimmedTranslationText) {
      if (!songTitle || !trimmedOriginalLyric || !sourceLocale) {
        return NextResponse.json({ error: '参数错误' }, { status: 400 });
      }

      const translation = await regenerateLyricTranslation(
        songTitle,
        trimmedOriginalLyric,
        trimmedTranslationText,
        sourceLocale
      );

      return NextResponse.json({ translation });
    }

    if (!songTitle || !lyrics || !Array.isArray(lyrics)) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }

    if (lyrics.length === 0) {
      return NextResponse.json({ items: [], translations: [] });
    }

    const items = await processLyricsInBatches(lyrics, songTitle);
    const translations = items.map((item) => item.translation);

    return NextResponse.json({ items, translations });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '翻译失败' },
      { status: 500 }
    );
  }
}
