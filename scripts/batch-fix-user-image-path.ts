/**
 * 批量修正用户头像路径
 * 
 * 将 /assets/profiles/xx.png 改为 /profiles/xx.png
 * 
 * 使用方法: pnpm tsx scripts/batch-fix-user-image-path.ts
 * 
 * 可选参数:
 *   --dry-run   只检查不实际更新数据库
 */

import * as fs from 'fs';
import * as path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { user } from '../src/lib/db/schema';
import { sql, like } from 'drizzle-orm';

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

async function main(dryRun: boolean) {
  console.log('');
  console.log('═'.repeat(60));
  console.log('🖼️  批量修正用户头像路径');
  console.log('═'.repeat(60));
  console.log(`   模式: ${dryRun ? '🔍 演练模式 (不修改数据)' : '⚡ 正式更新'}`);
  console.log('═'.repeat(60));
  console.log('');

  // 先查询所有用户的 image 值，看看实际格式
  console.log('📥 先检查所有用户的 image 字段值...\n');
  
  const allUsers = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(user);

  console.log(`共有 ${allUsers.length} 个用户，image 字段值如下：`);
  for (const u of allUsers) {
    console.log(`   ID: ${u.id}, image: "${u.image}"`);
  }
  console.log('');

  // 查询所有 image 字段包含 /assets/ 的用户（更宽泛的匹配）
  console.log('📥 正在查询需要修正的用户...');

  const usersToFix = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .where(like(user.image, '%/assets/%'));

  console.log(`📊 找到 ${usersToFix.length} 个需要修正的用户\n`);

  if (usersToFix.length === 0) {
    console.log('✅ 没有需要处理的记录');
    return;
  }

  // 显示要修改的用户
  console.log('📝 即将修改以下用户的头像路径:\n');
  for (const u of usersToFix) {
    const oldPath = u.image;
    const newPath = oldPath?.replace('/assets/', '/');
    console.log(`   ID: ${u.id}`);
    console.log(`   用户: ${u.name || u.email}`);
    console.log(`   旧路径: ${oldPath}`);
    console.log(`   新路径: ${newPath}`);
    console.log('   ---');
  }

  if (!dryRun) {
    console.log('\n⚡ 正在更新数据库...\n');

    // 使用 SQL 批量更新
    const result = await db.execute(sql`
      UPDATE "user" 
      SET image = REPLACE(image, '/assets/', '/')
      WHERE image LIKE '%/assets/%'
    `);

    console.log(`✅ 更新完成！共修改 ${usersToFix.length} 条记录`);
  } else {
    console.log('\n🔍 演练模式 - 未实际修改数据库');
  }

  console.log('\n' + '═'.repeat(60));
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

main(dryRun)
  .catch(console.error)
  .finally(() => pool.end());
