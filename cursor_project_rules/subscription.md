### 订阅接入与数据约定（Stripe Webhook + 后台操作）

本文仅关注“订阅本身”的数据与流程：订阅状态判断、核心 Redis 键、核心 DB 表，以及 webhook/后台操作如何更新这些数据。

### 公共判断方法（必须统一使用）
- 服务器侧统一使用 `src/redis/helpers/index.ts` 中的 `getUserSettings(userId)` 获取：
  - `subscription.active`: 由当前时间和 `subscription.expireTime` 比较得出，true 表示在订阅周期内。
  - `subscription.expireTime`: ISO 字符串。
  - `subscription.type`: `'subscription' | 'oneTime' | null`。
  - `subscription.subscription_id`: 关联到 `user_subscription.id`。
- 客户端侧通过 `src/hooks/use-subscription.ts` 获取 `expireTime` 和 `subscriptionType`，用于 UI 展示。
 

### Redis Key（必须使用常量，不得手拼）
- `USER_KEYS.settings(userId)` → `user:${userId}:settings`
  - 字段示例：
    - `subscription: { active: boolean, expireTime: string, type?: 'subscription' | 'oneTime' | null, subscription_id?: string | null }`
    - 其他用户信息（如 `timezone` 等）
  - TTL：不设置过期时间（无 TTL），是否在订阅期内依赖内部的 `expireTime` 判断。
- `USER_KEYS.subscriptionActive(userId)` → `user:${userId}:subscription:active`
  - 辅助布尔键。若存在可设置 TTL 为订阅剩余秒数；无订阅则删除该键。

### DB 表
- `user_subscription`（订阅主表）
  - 字段：`id`, `user_id`, `stripe_customer_id`, `stripe_customer_email`, `start_time`, `end_time`, `subscription_type`
  - 关系：`user_id` 外键到 `user.id`

### Webhook 更新流程（Stripe）
位置：`src/app/api/stripe/webhook/route.ts`
- 解析事件，获取用户与订阅的 `startTime`、`endTime`、`stripeCustomerId`、`stripeCustomerEmail`。
- 插入一条 `user_subscription` 记录，返回 `subscriptionId`。
- 更新 `USER_KEYS.settings(userId)`：保留已有设置，仅更新 `subscription` 字段：
  - `active: true`
  - `expireTime: endTime`
  - `type: 'subscription'`
  - `subscription_id: 新插入的 user_subscription.id`
- TTL 约定：`settings` 不设置 TTL（无限）；是否在订阅期内依赖 `expireTime`。
- 清理策略：清理与订阅状态相关的旧缓存键（如历史订阅期缓存）。

### 后台“升级/降级”更新流程
- 升级（`src/app/[locale]/dashboard/_server-functions/upgrade-user.ts`）
  - 插入 `user_subscription` 记录（一次性 `oneTime` 或自定义周期）。
  - 更新 `USER_KEYS.settings(userId)`：同上合并 `subscription` 字段；不设置 TTL。

- 降级（`src/app/[locale]/dashboard/_server-functions/downgrade-user.ts`）
  - 删除该用户的 `user_subscription` 记录。
  - 更新 `USER_KEYS.settings(userId)`：`subscription = { active: false, expireTime: null, type: null }`；不设置 TTL。
  - 删除 `USER_KEYS.subscriptionActive(userId)`。

### 关键一致性与本次核实/修正
 - `user:${userId}:settings` 键：此前部分代码使用了 24h TTL，已统一改为“无 TTL”。是否在订阅周期内由 `expireTime` 判断，公共方法为 `getUserSettings(userId)`。
 - 所有读写订阅状态相关的 Redis 键已切换为使用常量（`USER_KEYS`）。
 

### 示例：从公共方法判断订阅
```ts
import { getUserSettings } from '@/lib/auth';

const settings = await getUserSettings(userId);
if (settings.subscription.active) {
  // 在订阅期内
}
```

