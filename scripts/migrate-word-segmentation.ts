/**
 * 记忆卡片分词数据迁移脚本
 * 
 * 将旧的 kana_pronunciation 和 ruby_translations 数据迁移到新的 word_segmentation 格式
 * 
 * 使用方法: pnpm tsx scripts/migrate-word-segmentation.ts
 * 
 * 可选参数:
 *   --dry-run     只检查不实际更新数据库
 *   --limit N     限制处理的记录数量
 *   --batch N     批处理大小（默认 10）
 */

import * as fs from 'fs';
import * as path from 'path';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { memoCard } from '../src/lib/db/schema';
import { isNull, sql } from 'drizzle-orm';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// 手动加载 .env 文件
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=');
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ 请设置 DATABASE_URL 环境变量');
  process.exit(1);
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('❌ 请设置 OPENAI_API_KEY 环境变量');
  process.exit(1);
}

const sqlClient = neon(DATABASE_URL);
const db = drizzle(sqlClient);

const SEGMENTATION_MODEL = 'gpt-4o';

interface Segment {
  word: string;
  type: string;
  ruby?: string;
  translations?: {
    en: string;
    zh: string;
    'zh-TW': string;
  };
}

interface WordSegmentationV2 {
  version: 2;
  segments: Segment[];
  metadata: {
    source: 'ai' | 'manual';
    segmentedAt: string;
    model?: string;
  };
}

function getSegmentationPrompt(text: string): string {
  return `请对以下日语句子进行分词分析，返回JSON格式。

句子：「${text}」

要求：
1. 分词粒度要合理，保持语义完整性（如「食べられる」「していた」保持完整，不要过度拆分）
2. 每个词标注词性 type：noun/verb/adjective/adverb/particle/auxiliary/conjunction/interjection/prefix/suffix/symbol/foreign/unknown
3. 包含汉字的词添加 ruby 字段（平假名注音）
4. 外来语（カタカナ词）的 ruby 用英文原文（如 デザイン → design）
5. 对 N2 水平日语学习者值得翻译的词（尤其名词、动词）添加 translations 字段，特别常用的词可以略过
6. 助词、标点等不需要 translations

返回格式：
{
  "segments": [
    { "word": "...", "type": "..." },
    { "word": "...", "type": "...", "ruby": "..." },
    { "word": "...", "type": "...", "ruby": "...", "translations": { "en": "...", "zh": "...", "zh-TW": "..." } }
  ]
}

注意：只返回JSON，不要任何其他内容。`;
}

async function generateWordSegmentation(text: string): Promise<WordSegmentationV2 | null> {
  try {
    const result = await generateText({
      model: openai(SEGMENTATION_MODEL),
      messages: [{ role: 'user', content: getSegmentationPrompt(text) }],
      temperature: 0.7,
    });

    const content = result.text.trim();
    const jsonStr = content.replace(/^```json?\s*|\s*```$/g, '').trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) return null;
    
    const rawResult = JSON.parse(jsonMatch[0]);
    
    if (!rawResult.segments || !Array.isArray(rawResult.segments) || rawResult.segments.length === 0) {
      return null;
    }

    const validTypes = [
      'noun', 'verb', 'adjective', 'adverb', 'particle', 'auxiliary',
      'conjunction', 'interjection', 'prefix', 'suffix', 'symbol', 'foreign', 'unknown'
    ];

    const segments: Segment[] = rawResult.segments.map((seg: any) => {
      const type = validTypes.includes(seg.type) ? seg.type : 'unknown';
      const result: Segment = {
        word: seg.word,
        type,
      };
      if (seg.ruby) {
        result.ruby = seg.ruby;
      }
      if (seg.translations) {
        result.translations = seg.translations;
      }
      return result;
    });

    return {
      version: 2,
      segments,
      metadata: {
        source: 'ai',
        segmentedAt: new Date().toISOString(),
        model: SEGMENTATION_MODEL,
      },
    };
  } catch (error) {
    console.error('生成分词失败:', error);
    return null;
  }
}

function isValidWordSegmentationV2(ws: unknown): ws is WordSegmentationV2 {
  if (!ws || typeof ws !== 'object') return false;
  const obj = ws as any;
  return obj.version === 2 && Array.isArray(obj.segments) && obj.segments.length > 0;
}

async function migrate(options: { dryRun: boolean; limit: number | null; batchSize: number }) {
  const { dryRun, limit, batchSize } = options;

  console.log('🚀 开始迁移记忆卡片分词数据...');
  console.log(`   模式: ${dryRun ? '演练模式 (不会修改数据)' : '正式迁移'}`);
  console.log(`   限制: ${limit ?? '无限制'}`);
  console.log(`   批大小: ${batchSize}`);
  console.log('');

  // 查询需要迁移的记录（wordSegmentation 为 null 或不是 V2 格式）
  const baseQuery = db
    .select({
      id: memoCard.id,
      originalText: memoCard.originalText,
      wordSegmentation: memoCard.wordSegmentation,
    })
    .from(memoCard)
    .where(isNull(memoCard.wordSegmentation));

  const cards = limit
    ? await baseQuery.limit(limit)
    : await baseQuery;

  // 过滤出需要迁移的卡片
  const cardsToMigrate = cards.filter(card => {
    if (!card.wordSegmentation) return true;
    return !isValidWordSegmentationV2(card.wordSegmentation);
  });

  console.log(`📊 找到 ${cardsToMigrate.length} 条需要迁移的记录`);
  console.log('');

  if (cardsToMigrate.length === 0) {
    console.log('✅ 没有需要迁移的记录');
    return;
  }

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (let i = 0; i < cardsToMigrate.length; i += batchSize) {
    const batch = cardsToMigrate.slice(i, i + batchSize);
    console.log(`📦 处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(cardsToMigrate.length / batchSize)} (${batch.length} 条)`);

    for (const card of batch) {
      if (!card.originalText) {
        console.log(`  ⏭️  ${card.id.slice(0, 8)}... 跳过（无原文）`);
        skipCount++;
        continue;
      }

      console.log(`  🔄 ${card.id.slice(0, 8)}... "${card.originalText.slice(0, 30)}..."`);

      const newSegmentation = await generateWordSegmentation(card.originalText);

      if (!newSegmentation) {
        console.log(`  ❌ ${card.id.slice(0, 8)}... 生成失败`);
        failCount++;
        continue;
      }

      if (!dryRun) {
        try {
          await db.update(memoCard)
            .set({ 
              wordSegmentation: newSegmentation,
              updateTime: sql`CURRENT_TIMESTAMP`,
            })
            .where(sql`${memoCard.id} = ${card.id}`);
          console.log(`  ✅ ${card.id.slice(0, 8)}... 更新成功 (${newSegmentation.segments.length} 个分词)`);
        } catch (error) {
          console.log(`  ❌ ${card.id.slice(0, 8)}... 数据库更新失败:`, error);
          failCount++;
          continue;
        }
      } else {
        console.log(`  📝 ${card.id.slice(0, 8)}... 演练模式 (${newSegmentation.segments.length} 个分词)`);
      }

      successCount++;

      // 添加延迟避免 API 限流
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('');
  }

  console.log('📈 迁移完成统计:');
  console.log(`   成功: ${successCount}`);
  console.log(`   失败: ${failCount}`);
  console.log(`   跳过: ${skipCount}`);
  console.log(`   总计: ${cardsToMigrate.length}`);
}

// 解析命令行参数
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : null;
const batchIndex = args.indexOf('--batch');
const batchSize = batchIndex !== -1 ? parseInt(args[batchIndex + 1], 10) : 10;

migrate({ dryRun, limit, batchSize }).catch(console.error);
