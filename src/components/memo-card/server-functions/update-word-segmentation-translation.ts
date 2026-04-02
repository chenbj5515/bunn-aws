"use server";

import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { memoCard } from "@/lib/db/schema";
import {
  type SegmentTranslations,
  type WordSegmentationV2,
  wordSegmentationV2Schema,
} from "@/types/extended-memo-card";

type SupportedLocale = "en" | "zh" | "zh-TW";

function getBaseTranslations(
  translations: Partial<SegmentTranslations> | undefined
): SegmentTranslations {
  return {
    en: translations?.en ?? "",
    zh: translations?.zh ?? "",
    "zh-TW": translations?.["zh-TW"] ?? "",
  };
}

export async function updateWordSegmentationTranslation(
  memoCardId: string,
  segmentIndex: number,
  locale: SupportedLocale,
  translationText: string
): Promise<{ success: true; wordSegmentation: WordSegmentationV2 }> {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("用户未登录");
  }

  if (!Number.isInteger(segmentIndex) || segmentIndex < 0) {
    throw new Error("无效的 segment 索引");
  }

  const existingCard = await db
    .select({
      wordSegmentation: memoCard.wordSegmentation,
    })
    .from(memoCard)
    .where(
      and(eq(memoCard.id, memoCardId), eq(memoCard.userId, session.user.id))
    )
    .limit(1);

  const currentWordSegmentation = existingCard[0]?.wordSegmentation;
  const parsedWordSegmentation =
    wordSegmentationV2Schema.safeParse(currentWordSegmentation);

  if (!parsedWordSegmentation.success) {
    throw new Error("当前卡片没有可编辑的分词数据");
  }

  const currentData = parsedWordSegmentation.data;
  const currentSegment = currentData.segments[segmentIndex];

  if (!currentSegment) {
    throw new Error("未找到对应的单词片段");
  }

  const nextWordSegmentation: WordSegmentationV2 = {
    ...currentData,
    segments: currentData.segments.map((segment, index) => {
      if (index !== segmentIndex) {
        return segment;
      }

      const baseTranslations = getBaseTranslations(segment.translations);

      return {
        ...segment,
        translations: {
          ...baseTranslations,
          [locale]: translationText.trim(),
        },
      };
    }),
    metadata: {
      ...currentData.metadata,
      source: "manual",
      segmentedAt: new Date().toISOString(),
    },
  };

  await db
    .update(memoCard)
    .set({
      wordSegmentation: nextWordSegmentation,
      updateTime: new Date().toISOString(),
    })
    .where(
      and(eq(memoCard.id, memoCardId), eq(memoCard.userId, session.user.id))
    );

  return {
    success: true,
    wordSegmentation: nextWordSegmentation,
  };
}
