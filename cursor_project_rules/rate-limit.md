# 用户限制机制完整文档

## 概述

系统通过统一的**成本限制**（microUSD）控制用量，区分订阅用户与免费用户。

- **限额检查**：`checkLimit()`，实现于 `src/lib/auth/billing/limit.ts`。返回 `true` 表示仍可继续使用，`false` 表示已超限。
- **需要登录且要检查配额的 tRPC 能力**：使用 `rateLimitedProcedure`（`src/lib/trpc/procedures/rate-limited.ts`）。它在 context 上设置 `ctx.rateLimited`，**各 mutation 须在调用外部 API 前自行判断** `ctx.rateLimited` 并短路返回（本仓库内 AI/TTS 相关 procedure 均已处理）。
- **Redis 键**：一律通过 `SUBSCRIPTION_KEYS`、`FREE_KEYS`（`src/constants/redis-keys.ts`）访问，禁止手写拼接键名。

## 限制类型

### 订阅用户

- **周期内总成本上限**：4 美元（4,000,000 microUSD），阈值写死在 `limit.ts`（`SUBSCRIPTION_LIMIT_MICRO`），与 Stripe 订阅周期 Redis TTL 对齐的用量统计见计费文档。
- 代码路径上**未再单独**按「定价页文案中的 token 次数」做硬截断，以**成本累计**为准。

### 免费用户

- **每日总成本上限**：$0.1（100,000 microUSD），`FREE_LIMIT_MICRO`。
- 成本包含：OpenAI（按 tokens 折算）、MiniMax TTS（按字符）、Vercel Blob（按图片字节）等，均汇总进当日 `FREE_KEYS.costs.*`。
- 日期键按**用户设置中的时区**计算 `YYYY-MM-DD`（与 `track.ts` / `limit.ts` 一致）。

## 费用检查与追踪位置（与代码一致）

### 1. OpenAI / 流式对话

| 入口 | 文件 | 限额 | 入账 |
|------|------|------|------|
| 流式 Chat | `src/app/api/ai/chat/route.ts` | 请求前 `await checkLimit()` | `trackUsage`；输入/输出 tokens 由服务端 `countTokens()`（`gpt-tokenizer`）估算，非 OpenAI 返回的 usage |
| 字幕提取（Vision） | `src/lib/trpc/routers/ai/subtitles.ts` | `rateLimitedProcedure` + `ctx.rateLimited` | `after(() => trackUsage({ usage from generateText }))` |
| 记忆卡片翻译+分词 | `src/lib/trpc/routers/ai/memo-card.ts` | 同上 | 同上（并行两次 `generateText`） |
| 干扰项、多语言释义、问题翻译、text-to-sql 等 | `src/lib/trpc/routers/ai/*.ts` | 同上 | 同上 |

**说明**：仓库中**不存在** `src/app/api/ai/generate-text-stream/route.ts`。流式对话仅 **`POST /api/ai/chat`**。若前端仍有指向 `/api/ai/generate-text-stream` 的请求，需与代码对齐或补全 route。

### 2. MiniMax TTS

| 入口 | 文件 | 限额 | 入账 |
|------|------|------|------|
| 合成 | `src/lib/trpc/routers/tts/router/synthesize.ts` | `rateLimitedProcedure` + `ctx.rateLimited` | `trackUsage`，`costMeta: { provider: 'minimax', chars }`；缓存命中路径见该文件（记账细节见 `cost-calc.md`） |

**说明**：仓库中**不存在** `src/app/api/tts-minimax/route.ts`，TTS 走 **tRPC** `tts.synthesize`。

### 3. Vercel Blob 上传

| 入口 | 文件 | 限额 | 入账 |
|------|------|------|------|
| 服务端上传 | `src/server/upload.ts` | `uploadToBlob` 内 `checkLimit()` | 图片上传且 `trackUpload !== false` 时 `trackUsage`，`costMeta: { provider: 'blob', bytes: file.size }` |

### 4. 管理端 / 未纳入统一限额的路径（知晓即可）

以下接口仅 **admin** 或特定校验，**未调用** `checkLimit()` / `rateLimitedProcedure`，也**未** `trackUsage`：

- `src/app/api/music/translate/route.ts`
- `src/app/api/music/lyrics/route.ts`
- `src/app/api/music/ocr/route.ts`

## 核心检查逻辑（实现摘要）

实际代码见 `src/lib/auth/billing/limit.ts`，行为概要：

1. 无登录用户：`checkLimit()` 返回 `true`（不在此函数拦匿名；匿名能力由各 Route 自己 `getSession`）。
2. 订阅有效且有 `subscription_id`：读 `SUBSCRIPTION_KEYS.costs.total(userId)`；若无键则回退 DB `usage` 表同用户+订阅行。
3. 免费用户：按用户时区得到 `dateKey`，读 `FREE_KEYS.costs.total(userId, dateKey)`；若无键则回退 DB `usage` 表 `periodKey` 行。
4. `checkLimit` 内部异常时返回 `false`（偏保守：拒绝继续）。

## 费用追踪机制

- **函数**：`trackUsage(params)`，`src/lib/auth/billing/track.ts`。从 `getSession()` 取当前用户，**不接受客户端传入 userId**。
- **成本计算**：`calculateCostMicros`（`src/lib/auth/billing/cost.ts`），OpenAI 单价与微美元估算来自 `src/lib/auth/billing/helpers/index.ts`（`estimateOpenAICostMicroUSD` 等），定价常量见 `src/constants/ai-pricing.ts`。
- **Redis 写入**：`batchIncrementWithExpire`（`src/lib/auth/billing/helpers/redis.ts`），仅对 `value > 0` 的增量执行 `INCRBY`。
- **持久化**：`syncToDBAsync` / `logUsageToDB`（`src/lib/auth/billing/helpers/persistence.ts`），失败不阻断主流程。
- **常见异步入账**：tRPC 与 Chat route 中多用 `after(() => trackUsage(...))`，避免阻塞响应。

## Redis 键结构

与 `cost-calc.md`、`redis.md` 一致，订阅侧：

- `SUBSCRIPTION_KEYS.costs.total(userId)` 等

免费按天：

- `FREE_KEYS.costs.total(userId, date)` 等

批量扫描删除前缀：

- `SUBSCRIPTION_KEYS.prefixes.*`、`FREE_KEYS.prefixes.*`（见 `src/constants/redis-keys.ts`）

## 订阅周期与 Redis 用量键清理

新周期/开通订阅时，会在 Stripe Webhook 处理流程中删除上一周期累计用的订阅 Redis 键，避免与 DB 不一致。实现见 `src/app/api/stripe/webhook/route.ts` 中的 `getAllSubscriptionKeys` 与 `processSubscription`（在更新用户设置后对上述 key `DEL`）。

> 文档旧版中提到的 `src/app/[locale]/dashboard/_server-functions/upgrade-user.ts`、`downgrade-user.ts` **当前仓库不存在**；升降级与用量键请以 Stripe Webhook 及数据库订阅状态为准。

## 注意事项

1. **限额与入账不同步**：先 `checkLimit` 再调用模型再异步 `trackUsage` 时，并发请求可能出现短暂「检查都通过、累计略超阈值」的窗口。
2. **兜底**：Redis 缺键时用 DB `usage` 表判断是否在限额内（与 `limit.ts` 一致）。
3. **时区**：免费用户按用户设置时区切日；订阅 TTL 依赖 `user:{userId}:subscription` 等键的过期策略（见 `track.ts` 与 Redis 文档）。
4. **随机卡片等非成本限额**：`random-cards:{userId}:{date}:count` 等见 `FREE_KEYS` 与业务代码，与 `checkLimit` 独立。
