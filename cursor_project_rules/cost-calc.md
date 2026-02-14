# 计费与限额（实现与口径）

本文件总结系统内所有计费口径、Redis 统计键、默认单价（可被 ENV 覆盖）与限额实现位点，便于统一维护与核对。

## 一、统一成本与限额
- 订阅用户总成本阈值：默认 4 美元（ENV: `COST_LIMIT_USD`）。
- 免费用户每日总成本阈值：$0.1 美元（100,000 microUSD）。
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
- 校验入口：`src/utils/error-handling.ts` → `validateUserAndTokenLimit()` 委托 `checkTokenLimit()`；订阅按总成本4美元、免费按当日成本$0.1 判断。

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
- OpenAI：按输入/输出 tokens 计费；使用点：所有调用 `trackTokenCount({ inputTokens, outputTokens, model })` 的接口与函数。
- MiniMax TTS：按字符计费；使用点：`/api/tts-minimax` 成功生成后记 `provider='minimax'`。
- Vercel Blob：按上传图片尺寸计费（1GB = 7美元）；使用点：`src/server/upload.ts` 上传成功后记 `provider='blob'`。

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
- 成本统计失败不影响主流程；所有错误仅记录日志。
- usage→cost 的计算由 `src/utils/ai-cost.ts` 统一管理（OpenAI tokens、MiniMax chars、Blob bytes → microUSD）。
- 订阅 vs 免费的 TTL 对齐逻辑依赖 `src/redis/helpers`（订阅期 TTL，对齐至 period end；免费对齐至次日凌晨5点）。
- 统一聚合表：`usage`（订阅：`subscription_id`；免费：`period_key`）。
