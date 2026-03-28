import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { memoCard, wordCard } from "../src/lib/db/schema";
import type { WordSegmentationV2 } from "../src/types/extended-memo-card";

interface AutoWordCandidate {
  word: string;
  meaning: string;
  kanaPronunciation?: string;
}

function getAutoWordCandidate(wordSegmentation: WordSegmentationV2): AutoWordCandidate | null {
  const translatedSegments = wordSegmentation.segments.filter((segment) => {
    if (!segment.translations) {
      return false;
    }

    const meaning =
      segment.translations.zh
      || segment.translations.en
      || segment.translations["zh-TW"];

    return Boolean(segment.word.trim()) && Boolean(meaning?.trim());
  });

  if (translatedSegments.length === 0) {
    return null;
  }

  const longestSegment = translatedSegments.reduce((longest, current) => {
    return current.word.length > longest.word.length ? current : longest;
  });

  const meaning =
    longestSegment.translations?.zh
    || longestSegment.translations?.en
    || longestSegment.translations?.["zh-TW"];

  if (!meaning) {
    return null;
  }

  return {
    word: longestSegment.word,
    meaning,
    kanaPronunciation: longestSegment.ruby,
  };
}

function getProductionDatabaseUrl(): string {
  const rawDatabaseUrl = process.env.DATABASE_URL;
  if (!rawDatabaseUrl) {
    throw new Error("DATABASE_URL 未设置，无法执行生产回填。");
  }

  if (process.env.BACKFILL_TARGET !== "production") {
    throw new Error("请显式设置 BACKFILL_TARGET=production 后再执行。");
  }

  const databaseUrl = rawDatabaseUrl.trim().replace(/^['"]|['"]$/g, "");
  const hostname = new URL(databaseUrl).hostname;
  const blockedHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "postgres"]);
  const allowDockerPostgresOnVps = process.env.BACKFILL_ALLOW_DOCKER_POSTGRES === "1";

  if (hostname === "postgres" && allowDockerPostgresOnVps) {
    return databaseUrl;
  }

  if (blockedHosts.has(hostname)) {
    throw new Error(`当前 DATABASE_URL 指向本地/容器数据库主机 ${hostname}，脚本已拒绝执行。`);
  }

  return databaseUrl;
}

async function main() {
  const databaseUrl = getProductionDatabaseUrl();
  const client = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  const db = drizzle(client);

  try {
    const cards = await db
      .select({
        id: memoCard.id,
        userId: memoCard.userId,
        wordSegmentation: memoCard.wordSegmentation,
      })
      .from(memoCard)
      .where(
        sql`${eq(memoCard.platform, "youtube")} and not exists (
          select 1
          from ${wordCard}
          where ${wordCard.memoCardId} = ${memoCard.id}
        )`
      );

    let insertedCount = 0;
    let skippedNoSegmentationCount = 0;
    let skippedNoTranslationCount = 0;

    console.log(`准备检查 ${cards.length} 张 memo card。`);

    for (const card of cards) {
      const wordSegmentation = card.wordSegmentation as WordSegmentationV2 | null;

      if (!wordSegmentation || wordSegmentation.version !== 2 || !Array.isArray(wordSegmentation.segments)) {
        skippedNoSegmentationCount += 1;
        continue;
      }

      const autoWordCandidate = getAutoWordCandidate(wordSegmentation);
      if (!autoWordCandidate) {
        skippedNoTranslationCount += 1;
        continue;
      }

      await db.insert(wordCard).values({
        word: autoWordCandidate.word,
        meaning: autoWordCandidate.meaning,
        kanaPronunciation: autoWordCandidate.kanaPronunciation ?? "",
        createTime: sql`CURRENT_TIMESTAMP`,
        userId: card.userId,
        memoCardId: card.id,
      });

      insertedCount += 1;

      if (insertedCount % 100 === 0) {
        console.log(`已回填 ${insertedCount} 条 word card...`);
      }
    }

    console.log("回填完成。");
    console.log(`新增 word card: ${insertedCount}`);
    console.log(`跳过（无分词）: ${skippedNoSegmentationCount}`);
    console.log(`跳过（无可用翻译词）: ${skippedNoTranslationCount}`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("生产回填失败:", error);
  process.exit(1);
});
