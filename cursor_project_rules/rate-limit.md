# 用户限制机制完整文档

## 概述

系统通过统一的**成本限制**机制来控制用户的使用量，区分订阅用户和免费用户。核心限制检查函数为 `validateUserAndTokenLimit()`，位于 `src/utils/error-handling.ts`。

重要约定：所有 Redis 键必须通过 `SUBSCRIPTION_KEYS` 和 `FREE_KEYS` 访问，禁止手写字符串拼接键名。

## 限制类型

### 订阅用户
- **月度成本限制**：不超过4美元（4,000,000 微美元）
- **无其他数量限制**：可以无限制使用所有功能

### 免费用户
- **每日成本限制**：不超过 $0.1（100,000 微美元）
- 成本包含：OpenAI tokens、MiniMax TTS、Vercel Blob 存储等所有计费项

## 费用检查位置

### 1. OPENAI接口

#### generate-text-stream API
- **文件位置**：`src/app/api/ai/generate-text-stream/route.ts`
- **关键函数**：`validateUserAndTokenLimit()` （第110行）
- **限制检查**：在开始流式响应前检查用户限制
- **费用追踪**：实时记录tokens使用，支持增量计费

#### OCR (图片文字识别)
- **文件位置**：`src/app/api/ai/extract-subtitles/route.ts`
- **关键函数**：`validateUserAndTokenLimit()` （第22行）
- **限制检查**：在调用OpenAI Vision API前检查限制
- **费用追踪**：记录GPT-4o的使用tokens

### 2. MiniMax TTS接口

#### TTS合成
- **文件位置**：`src/app/api/tts-minimax/route.ts`
- **关键函数**：`validateUserAndTokenLimit()` （第22行）
- **限制检查**：在调用MiniMax API前检查限制
- **费用追踪**：按字符数计费（`trackTokenCount()` with `costMeta.chars`）

### 3. Vercel Blob上传

#### 上传服务端函数
- **文件位置**：`src/server/upload.ts`
- **关键函数**：`validateUserAndTokenLimit()`
- **限制检查**：在上传文件前检查成本限制
- **费用追踪**：按文件大小计费存储成本（`trackTokenCount()` with `costMeta.bytes`）

## 核心检查逻辑

### 主入口函数
```typescript
// src/utils/error-handling.ts
export const validateUserAndTokenLimit = async () => {
  const isWithinLimit = await checkTokenLimit();
  // 返回是否在限制内
}
```

### 核心限制检查
```typescript
// src/redis/token-tracker.ts
export async function checkTokenLimit() {
  // 订阅用户：检查成本是否超过4美元
  if (subscription.active) {
    const costMicro = await redis.get(SUBSCRIPTION_KEYS.costs.total(userId));
    return costMicro < 4_000_000;
  }

  // 免费用户：检查每日成本是否超过 $0.1
  const costMicro = await redis.get(FREE_KEYS.costs.total(userId, dateKey));
  return costMicro < 100_000;
}
```

## 费用追踪机制

### 统一成本追踪
- **函数**：`trackTokenCount()` in `src/redis/token-tracker.ts`
- **存储**：分别存储到 Redis 的订阅用户键和免费用户键
- **持久化**：异步写入数据库
- **计费项**：
  - **OpenAI**：按输入/输出 tokens 计费
  - **MiniMax TTS**：按字符数计费（`costMeta.chars`）
  - **Vercel Blob**：按存储大小计费（`costMeta.bytes`）

## Redis键结构

### 订阅用户
统一通过 `SUBSCRIPTION_KEYS` 获取：
- `SUBSCRIPTION_KEYS.costs.total(userId)` - 总成本（微美元）
- `SUBSCRIPTION_KEYS.costs.openaiTotal(userId)` - OpenAI 成本
- `SUBSCRIPTION_KEYS.costs.minimaxTts(userId)` - MiniMax TTS 成本
- `SUBSCRIPTION_KEYS.costs.vercelBlob(userId)` - Vercel Blob 成本

### 免费用户
统一通过 `FREE_KEYS` 获取：
- `FREE_KEYS.costs.total(userId, date)` - 每日总成本（微美元）
- `FREE_KEYS.costs.openaiTotal(userId, date)` - 每日 OpenAI 成本
- `FREE_KEYS.costs.minimaxTts(userId, date)` - 每日 MiniMax TTS 成本
- `FREE_KEYS.costs.vercelBlob(userId, date)` - 每日 Vercel Blob 成本

### 批量清理前缀（仅用于扫描删除，不用于直接读写值）
- 订阅相关：`SUBSCRIPTION_KEYS.prefixes.all(userId)`、`SUBSCRIPTION_KEYS.prefixes.costs(userId)`
- 免费相关：`FREE_KEYS.prefixes.costs(userId)`

## 注意事项

1. **统一入口**：所有费用相关的API都通过 `validateUserAndTokenLimit()` 检查
2. **异步追踪**：费用记录使用 `after()` 确保不阻塞响应
3. **兜底机制**：Redis不可用时回退到数据库查询
4. **时区支持**：免费用户限制基于用户时区计算日期
5. **升级/降级清理规则**：
   - 升级为付费：必须清空该用户所有免费相关的 Redis 键（使用 `FREE_KEYS.prefixes.*` 扫描删除）。实现位置：`src/app/[locale]/dashboard/_server-functions/upgrade-user.ts`。
   - 降级为免费：必须清空该用户所有订阅相关的 Redis 键（使用 `SUBSCRIPTION_KEYS.prefixes.*` 扫描删除）。实现位置：`src/app/[locale]/dashboard/_server-functions/downgrade-user.ts`。
