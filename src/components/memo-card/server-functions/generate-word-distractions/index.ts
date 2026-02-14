'use server';

import { db } from '@/lib/db';
import { wordCard } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getServerTrpc } from '@/lib/trpc/server';

/** 为新建单词生成并持久化干扰项，后台静默执行 */
export async function generateAndSaveDistractions(
  wordCardId: string,
  params: { word: string; meaning: string; meaningNew: Record<string, string> | null; kanaPronunciation?: string },
  cookieHeader?: string
): Promise<void> {
  const meaning = params.meaningNew ?? { zh: params.meaning, en: params.meaning, 'zh-TW': params.meaning };
  const headers = cookieHeader ? new Headers({ Cookie: cookieHeader }) : undefined;
  const trpc = await getServerTrpc(headers);
  const result = await trpc.ai.generateWordDistractions({
    word: params.word,
    kanaPronunciation: params.kanaPronunciation ?? '',
    meaning,
  });
  if (result.errorCode !== null) return;

  const payload = {
    meaningDistractions: result.meaningDistractions,
    pronunciationDistractions: result.pronunciationDistractions,
  };
  await db.update(wordCard).set(payload).where(eq(wordCard.id, wordCardId));
}
