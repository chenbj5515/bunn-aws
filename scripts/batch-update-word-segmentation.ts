/**
 * 批量更新指定用户的 word_segmentation 字段
 * 
 * 使用方法: pnpm tsx scripts/batch-update-word-segmentation.ts
 * 
 * 可选参数:
 *   --dry-run        只检查不实际更新数据库
 *   --concurrency N  并发数量（默认 5）
 *   --user-id ID     指定用户 ID（默认 e390urIOYotFcXkyOXY0MxxrgJcfyiHq）
 */

import * as fs from 'fs';
import * as path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { memoCard } from '../src/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
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

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

const SEGMENTATION_MODEL = 'gpt-4o';

// ============================================
// 类型定义
// ============================================

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

interface CardData {
  id: string;
  originalText: string | null;
}

interface TaskResult {
  id: string;
  success: boolean;
  segmentCount?: number;
  error?: string;
  originalText?: string;
}

// ============================================
// 进度显示
// ============================================

class ProgressTracker {
  private total: number;
  private completed: number = 0;
  private success: number = 0;
  private failed: number = 0;
  private skipped: number = 0;
  private startTime: number;
  private results: TaskResult[] = [];

  constructor(total: number) {
    this.total = total;
    this.startTime = Date.now();
  }

  update(result: TaskResult) {
    this.completed++;
    this.results.push(result);

    if (result.success) {
      this.success++;
    } else if (result.error === 'skipped') {
      this.skipped++;
    } else {
      this.failed++;
    }

    this.render(result);
  }

  private render(latestResult: TaskResult) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const percent = Math.round((this.completed / this.total) * 100);
    const bar = this.createProgressBar(percent);
    
    // 清除当前行并重新显示
    process.stdout.write('\r\x1b[K');
    
    // 状态图标
    const icon = latestResult.success ? '✅' : (latestResult.error === 'skipped' ? '⏭️' : '❌');
    
    // 显示最新结果
    const shortId = latestResult.id.slice(0, 8);
    const textPreview = latestResult.originalText 
      ? `"${latestResult.originalText.slice(0, 25)}${latestResult.originalText.length > 25 ? '...' : ''}"`
      : '(无原文)';
    
    const segmentInfo = latestResult.success && latestResult.segmentCount 
      ? ` → ${latestResult.segmentCount} 个分词`
      : '';
    
    console.log(`${icon} ${shortId}... ${textPreview}${segmentInfo}`);
    
    // 显示进度条
    console.log(`\n${bar} ${percent}% (${this.completed}/${this.total}) | ✅${this.success} ❌${this.failed} ⏭️${this.skipped} | ${elapsed}s\n`);
  }

  private createProgressBar(percent: number): string {
    const width = 40;
    const filled = Math.round(width * percent / 100);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  summary() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const avgTime = (parseFloat(elapsed) / this.completed).toFixed(2);
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 批量更新完成统计');
    console.log('═'.repeat(60));
    console.log(`   总数:     ${this.total}`);
    console.log(`   成功:     ${this.success} ✅`);
    console.log(`   失败:     ${this.failed} ❌`);
    console.log(`   跳过:     ${this.skipped} ⏭️`);
    console.log(`   耗时:     ${elapsed}s`);
    console.log(`   平均:     ${avgTime}s/条`);
    console.log('═'.repeat(60));

    // 显示失败的记录
    const failures = this.results.filter(r => !r.success && r.error !== 'skipped');
    if (failures.length > 0) {
      console.log('\n❌ 失败的记录:');
      failures.forEach(f => {
        console.log(`   - ${f.id}: ${f.error}`);
      });
    }
  }
}

// ============================================
// AI 处理
// ============================================

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
    throw error;
  }
}

// ============================================
// 单个任务处理
// ============================================

async function processCard(
  card: CardData,
  dryRun: boolean
): Promise<TaskResult> {
  if (!card.originalText) {
    return {
      id: card.id,
      success: false,
      error: 'skipped',
      originalText: card.originalText || undefined,
    };
  }

  try {
    const segmentation = await generateWordSegmentation(card.originalText);
    
    if (!segmentation) {
      return {
        id: card.id,
        success: false,
        error: 'AI 生成失败',
        originalText: card.originalText,
      };
    }

    if (!dryRun) {
      await db.update(memoCard)
        .set({ 
          wordSegmentation: segmentation,
          updateTime: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(memoCard.id, card.id));
    }

    return {
      id: card.id,
      success: true,
      segmentCount: segmentation.segments.length,
      originalText: card.originalText,
    };
  } catch (error) {
    return {
      id: card.id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      originalText: card.originalText,
    };
  }
}

// ============================================
// 并发控制
// ============================================

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
  onComplete: (result: R) => void
): Promise<R[]> {
  const results: R[] = [];
  const queue = [...items];
  
  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item) {
        const result = await fn(item);
        results.push(result);
        onComplete(result);
      }
    }
  }

  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

// ============================================
// 主函数
// ============================================

async function main(options: { 
  dryRun: boolean; 
  concurrency: number; 
  userId: string;
}) {
  const { dryRun, concurrency, userId } = options;

  console.log('');
  console.log('═'.repeat(60));
  console.log('🚀 批量更新 word_segmentation');
  console.log('═'.repeat(60));
  console.log(`   用户 ID:   ${userId}`);
  console.log(`   平台:      youtube`);
  console.log(`   并发数:    ${concurrency}`);
  console.log(`   模式:      ${dryRun ? '🔍 演练模式 (不修改数据)' : '⚡ 正式更新'}`);
  console.log('═'.repeat(60));
  console.log('');

  // 查询该用户的所有 youtube 平台的 memoCard
  console.log('📥 正在查询数据...');
  const cards = await db
    .select({
      id: memoCard.id,
      originalText: memoCard.originalText,
    })
    .from(memoCard)
    .where(and(
      eq(memoCard.userId, userId),
      eq(memoCard.platform, 'youtube')
    ));

  console.log(`📊 找到 ${cards.length} 条记录\n`);

  if (cards.length === 0) {
    console.log('✅ 没有需要处理的记录');
    return;
  }

  // 创建进度追踪器
  const progress = new ProgressTracker(cards.length);

  // 并发处理
  await runWithConcurrency(
    cards,
    concurrency,
    (card) => processCard(card, dryRun),
    (result) => progress.update(result)
  );

  // 显示统计
  progress.summary();
}

// ============================================
// 命令行参数解析
// ============================================

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const concurrencyIndex = args.indexOf('--concurrency');
const concurrency = concurrencyIndex !== -1 
  ? parseInt(args[concurrencyIndex + 1], 10) 
  : 5;

const userIdIndex = args.indexOf('--user-id');
const userId = userIdIndex !== -1 
  ? args[userIdIndex + 1] 
  : 'e390urIOYotFcXkyOXY0MxxrgJcfyiHq';

main({ dryRun, concurrency, userId })
  .catch(console.error)
  .finally(() => pool.end());
