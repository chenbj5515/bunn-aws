/**
 * 批量为没有关联单词的记忆卡片创建单词关联
 * 
 * 使用方法: pnpm tsx scripts/batch-link-word-to-memo.ts
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
import { memoCard, wordCard } from '../src/lib/db/schema';
import { and, eq, sql, notExists } from 'drizzle-orm';

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

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

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
  userId: string;
  originalText: string | null;
  wordSegmentation: WordSegmentationV2 | null;
}

interface TaskResult {
  id: string;
  success: boolean;
  word?: string;
  meaning?: string;
  error?: string;
  originalText?: string;
  reason?: string;
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
  private noTranslation: number = 0;
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
    } else if (result.reason === 'no_translation') {
      this.noTranslation++;
    } else if (result.reason === 'skipped') {
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
    let icon = '❌';
    if (latestResult.success) {
      icon = '✅';
    } else if (latestResult.reason === 'no_translation') {
      icon = '📭';
    } else if (latestResult.reason === 'skipped') {
      icon = '⏭️';
    }
    
    // 显示最新结果
    const shortId = latestResult.id.slice(0, 8);
    const textPreview = latestResult.originalText 
      ? `"${latestResult.originalText.slice(0, 20)}${latestResult.originalText.length > 20 ? '...' : ''}"`
      : '(无原文)';
    
    const wordInfo = latestResult.success && latestResult.word
      ? ` → 「${latestResult.word}」`
      : '';
    
    console.log(`${icon} ${shortId}... ${textPreview}${wordInfo}`);
    
    // 显示进度条
    console.log(`\n${bar} ${percent}% (${this.completed}/${this.total})`);
    console.log(`✅ 成功:${this.success} | 📭 无翻译:${this.noTranslation} | ⏭️ 跳过:${this.skipped} | ❌ 失败:${this.failed} | ⏱️ ${elapsed}s\n`);
  }

  private createProgressBar(percent: number): string {
    const width = 50;
    const filled = Math.round(width * percent / 100);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  summary() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const avgTime = this.completed > 0 ? (parseFloat(elapsed) / this.completed).toFixed(2) : '0';
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 批量关联单词完成统计');
    console.log('═'.repeat(60));
    console.log(`   总数:         ${this.total}`);
    console.log(`   成功插入:     ${this.success} ✅`);
    console.log(`   无翻译词:     ${this.noTranslation} 📭`);
    console.log(`   跳过:         ${this.skipped} ⏭️`);
    console.log(`   失败:         ${this.failed} ❌`);
    console.log(`   耗时:         ${elapsed}s`);
    console.log(`   平均:         ${avgTime}s/条`);
    console.log('═'.repeat(60));

    // 显示成功插入的单词列表
    const successes = this.results.filter(r => r.success);
    if (successes.length > 0) {
      console.log('\n✅ 成功插入的单词:');
      successes.slice(0, 20).forEach(s => {
        console.log(`   「${s.word}」 - ${s.meaning}`);
      });
      if (successes.length > 20) {
        console.log(`   ... 还有 ${successes.length - 20} 个单词`);
      }
    }

    // 显示失败的记录
    const failures = this.results.filter(r => !r.success && r.reason !== 'no_translation' && r.reason !== 'skipped');
    if (failures.length > 0) {
      console.log('\n❌ 失败的记录:');
      failures.forEach(f => {
        console.log(`   - ${f.id}: ${f.error}`);
      });
    }
  }
}

// ============================================
// 工具函数
// ============================================

/**
 * 从 wordSegmentation 中找出有翻译的最长单词
 */
function findLongestWordWithTranslation(segmentation: WordSegmentationV2): Segment | null {
  const segmentsWithTranslation = segmentation.segments.filter(
    seg => seg.translations && seg.translations.zh
  );

  if (segmentsWithTranslation.length === 0) {
    return null;
  }

  // 按单词长度降序排序，返回最长的
  segmentsWithTranslation.sort((a, b) => b.word.length - a.word.length);
  return segmentsWithTranslation[0];
}

// ============================================
// 单个任务处理
// ============================================

async function processCard(
  card: CardData,
  dryRun: boolean
): Promise<TaskResult> {
  // 检查是否有 wordSegmentation
  if (!card.wordSegmentation) {
    return {
      id: card.id,
      success: false,
      reason: 'skipped',
      error: '没有 wordSegmentation 数据',
      originalText: card.originalText || undefined,
    };
  }

  // 检查 wordSegmentation 格式
  if (!card.wordSegmentation.segments || !Array.isArray(card.wordSegmentation.segments)) {
    return {
      id: card.id,
      success: false,
      reason: 'skipped',
      error: 'wordSegmentation 格式不正确',
      originalText: card.originalText || undefined,
    };
  }

  // 找出有翻译的最长单词
  const longestWord = findLongestWordWithTranslation(card.wordSegmentation);

  if (!longestWord) {
    return {
      id: card.id,
      success: false,
      reason: 'no_translation',
      error: '没有带翻译的单词',
      originalText: card.originalText || undefined,
    };
  }

  try {
    if (!dryRun) {
      // 插入到 wordCard 表
      await db.insert(wordCard).values({
        word: longestWord.word,
        kanaPronunciation: longestWord.ruby || '',
        meaning: longestWord.translations!.zh,
        meaning_new: longestWord.translations,
        memoCardId: card.id,
        userId: card.userId,
        createTime: sql`CURRENT_TIMESTAMP`,
        reviewTimes: 0,
        forgetCount: 0,
      });
    }

    return {
      id: card.id,
      success: true,
      word: longestWord.word,
      meaning: longestWord.translations!.zh,
      originalText: card.originalText || undefined,
    };
  } catch (error) {
    return {
      id: card.id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      originalText: card.originalText || undefined,
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
  console.log('🔗 批量为记忆卡片关联单词');
  console.log('═'.repeat(60));
  console.log(`   用户 ID:   ${userId}`);
  console.log(`   平台:      youtube`);
  console.log(`   并发数:    ${concurrency}`);
  console.log(`   模式:      ${dryRun ? '🔍 演练模式 (不修改数据)' : '⚡ 正式更新'}`);
  console.log('═'.repeat(60));
  console.log('');

  // 查询该用户的所有 youtube 平台的 memoCard，且没有关联的 wordCard
  console.log('📥 正在查询没有关联单词的记忆卡片...');
  
  // 子查询：找出所有有关联 wordCard 的 memoCardId
  const cardsWithWords = db
    .select({ memoCardId: wordCard.memoCardId })
    .from(wordCard)
    .where(eq(wordCard.userId, userId));

  const cards = await db
    .select({
      id: memoCard.id,
      userId: memoCard.userId,
      originalText: memoCard.originalText,
      wordSegmentation: memoCard.wordSegmentation,
    })
    .from(memoCard)
    .where(and(
      eq(memoCard.userId, userId),
      eq(memoCard.platform, 'youtube'),
      notExists(
        db.select({ one: sql`1` })
          .from(wordCard)
          .where(eq(wordCard.memoCardId, memoCard.id))
      )
    ));

  console.log(`📊 找到 ${cards.length} 条没有关联单词的记忆卡片\n`);

  if (cards.length === 0) {
    console.log('✅ 没有需要处理的记录');
    return;
  }

  // 统计有 wordSegmentation 的数量
  const cardsWithSegmentation = cards.filter(c => c.wordSegmentation);
  console.log(`📝 其中有 wordSegmentation 的: ${cardsWithSegmentation.length} 条\n`);

  // 创建进度追踪器
  const progress = new ProgressTracker(cards.length);

  // 并发处理
  await runWithConcurrency(
    cards as CardData[],
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
