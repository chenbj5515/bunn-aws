"use server";

import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { memoCard } from "@/lib/db/schema";
import {
  type Segment,
  type WordSegmentationV2,
  wordSegmentationV2Schema,
} from "@/types/extended-memo-card";

function buildNextSegment(segment: Segment, rubyText: string): Segment {
  const trimmedRuby = rubyText.trim();
  if (!trimmedRuby) {
    const { ruby, ...rest } = segment;
    return rest;
  }

  return {
    ...segment,
    ruby: trimmedRuby,
  };
}

export async function updateWordSegmentationRuby(
  memoCardId: string,
  segmentIndex: number,
  rubyText: string
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

  if (!currentData.segments[segmentIndex]) {
    throw new Error("未找到对应的单词片段");
  }

  const nextWordSegmentation: WordSegmentationV2 = {
    ...currentData,
    segments: currentData.segments.map((segment, index) =>
      index === segmentIndex ? buildNextSegment(segment, rubyText) : segment
    ),
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
