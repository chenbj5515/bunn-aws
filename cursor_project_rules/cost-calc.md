# 计费与限额（实现与口径）

本文件总结系统内所有计费口径、Redis 统计键、默认单价（可被 ENV 覆盖）与限额实现位点，便于统一维护与核对。

## 一、统一成本与限额
- 订阅用户总成本阈值：**4 美元**（4,000,000 microUSD），常量 `SUBSCRIPTION_LIMIT_MICRO`（`src/lib/auth/billing/limit.ts`）。当前代码**未**从 `COST_LIMIT_USD` 等 ENV 读取，若需可配置应改 `limit.ts` 并同步本文档。
- 免费用户每日总成本阈值：**$0.1**（100,000 microUSD），常量 `FREE_LIMIT_MICRO`（同上）。
- 计费项累计到：
  - 订阅用户（TTL 对齐订阅期）：
    - `user:{userId}:subscription:cost_micro:total`
    - `user:{userId}:subscription:cost_micro:openai_total`
    - `user:{userId}:subscription:cost_micro:minimax_tts`
    - `user:{userId}:subscription:cost_micro:vercel_blob`
  - 免费用户（按天、按用户时区）：
    - `token:{userId}:{YYYY-MM-DD}:cost_micro:total`
    - `token:{userId}:{YYYY-MM-DD}:cost_micro:openai_total`
    - `token:{userId}:{YYYY-MM-DD}:cost_micro:minimax_tts`
    - `token:{userId}:{YYYY-MM-DD}:cost_micro:vercel_blob`
- 校验入口：`checkLimit()`（`src/lib/auth/billing/limit.ts`）。订阅用户按周期内总成本与 4 美元比较；免费用户按用户时区当日总成本与 $0.1 比较。需要配额的 tRPC 能力另经 `rateLimitedProcedure`（`src/lib/trpc/procedures/rate-limited.ts`）在 context 中标记 `rateLimited`，由具体 procedure 在调 AI 前短路。

## 二、免费用户每日额度（已实装）
- 成本：当日总成本上限 $0.1（100,000 microUSD）。
- 其他功能限制保留：
  - "给我来点"随机卡片：按日次数 → `random-cards:{userId}:{YYYY-MM-DD}:count`。

## 三、单价（默认值）与 ENV
- 见 `src/constants/ai-pricing.ts`，所有单价有默认值并可被 ENV 覆盖：
  - OpenAI（USD / 1K tokens）：
    - gpt-4o：in 0.005，out 0.015
    - gpt-4o-mini：in 0.00015，out 0.0006
  - MiniMax TTS（USD / 1K characters）：0.012
  - Vercel Blob：按上传图片尺寸计费 $7 / GB

## 四、计费口径与接入点
- OpenAI：按输入/输出 tokens 折算成本；统一通过 `trackUsage({ inputTokens, outputTokens, model, costMeta? })`（`src/lib/auth/billing/track.ts`）。典型调用点：各 `rateLimitedProcedure` 的 AI mutation（`src/lib/trpc/routers/ai/*.ts`）在 `after()` 中用 `generateText` 返回的 `usage`；`POST /api/ai/chat`（`src/app/api/ai/chat/route.ts`）用服务端 `countTokens()` 估算而非 OpenAI usage。
- MiniMax TTS：按字符计费；使用点：**tRPC** `tts.synthesize`（`src/lib/trpc/routers/tts/router/synthesize.ts`），`costMeta: { provider: 'minimax', chars }`。（仓库中无 `/api/tts-minimax` route。）
- Vercel Blob：按上传图片字节计费（定价见 `ai-pricing.ts`）；使用点：`src/server/upload.ts` 中 `trackUsage`，`costMeta: { provider: 'blob', bytes }`。

## 五、Redis 统计键（聚合）
- 订阅维度（见 `SUBSCRIPTION_KEYS.costs.*`）：`user:{userId}:subscription:cost_micro:*`
- 免费按天（见 `FREE_KEYS.costs.*`）：`token:{userId}:{YYYY-MM-DD}:cost_micro:*`
- 其他：随机卡片 `random-cards:{userId}:{YYYY-MM-DD}:count`
- 详见 `cursor_project_rules/redis.md`。

## 六、前端展示（定价页）
- Premium 方案展示：
  - tokens：最多 1,000,000 tokens/月
  - images：最多 300MB 图片上传/月
  - tts：最多 5,000 次/月
- 文案来源：`messages/*` → `pricing.proPlan.features.{tokens,images,tts}`。

## 七、注意事项
- 成本统计失败不影响主流程；`trackUsage` 内 catch 会静默返回，不抛错。
- usage→cost：`calculateCostMicros`（`src/lib/auth/billing/cost.ts`）+ `src/lib/auth/billing/helpers/index.ts` 中的 `estimateOpenAICostMicroUSD`、`estimateMiniMaxTTSCostMicroUSD`、`estimateVercelBlobStorageCostMicroUSD`（OpenAI tokens、MiniMax chars、Blob bytes → microUSD）。
- 订阅侧 Redis 增量时的 TTL：读取 `user:{userId}:subscription` 的 TTL（`track.ts`）。免费侧 TTL：`getSecondsUntilNextDailyReset(timezone)`（`src/lib/auth/billing/helpers/index.ts`，对齐用户时区**下一次凌晨 5 点**重置，而非自然日零点）。
- 统一聚合表：`usage`（`src/lib/db/schema.ts`；订阅行带 `subscription_id`，免费行带 `period_key`）。
