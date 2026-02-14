# 认证与用户数据系统

## 核心原则：Session 与 UserSettings 分离

```
┌─────────────────────────────────────────────────────────────┐
│                    Session (better-auth)                     │
│  职责：身份认证                                               │
│  内容：user.id, user.email, user.name, user.image            │
│  获取：getSession()                                          │
│  存储：Redis (secondaryStorage) + DB (session 表)            │
└─────────────────────────────────────────────────────────────┘
                              ↓
                         user.id
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   UserSettings (业务数据)                    │
│  职责：订阅、偏好、统计                                       │
│  内容：subscription, timezone, achievementPoints, ...        │
│  获取：getUserSettings(userId)                               │
│  存储：Redis USER_KEYS.settings(userId)                      │
└─────────────────────────────────────────────────────────────┘
```

**规则**：
- Session 只问"这个人是谁"
- UserSettings 问"这个人的业务状态是什么"
- **不要**在 Session 里塞业务数据

## 用户生命周期

### 注册
```
better-auth 创建 user (DB)
         ↓
databaseHooks.user.create.after
         ↓
initUserSettings(userId) → Redis 初始化默认 UserSettings
```

### 使用
```typescript
// 1. 获取用户身份
const session = await getSession();
if (!session?.user?.id) throw new Error('未登录');

// 2. 获取业务数据
const settings = await getUserSettings(session.user.id);
const { subscription, timezone } = settings;
```

### 删除
```
user.deleteUser.afterDelete
         ↓
cleanupUserRedisData(userId) → 清理 Redis 数据
```

## UserSettings 结构

```typescript
interface UserSettings {
  subscription: {
    active: boolean;
    expireTime: string;
    type?: 'subscription' | 'oneTime' | null;
    subscription_id?: string | null;
  };
  timezone: string;
  uiLocale?: string;
  achievementPoints: number;
  correctAnswersCount: number;
  totalAnswersCount: number;
}
```

默认值（注册时初始化）：
```typescript
{
  subscription: { active: false, expireTime: '', type: null, subscription_id: null },
  timezone: 'Asia/Shanghai',
  achievementPoints: 0,
  correctAnswersCount: 0,
  totalAnswersCount: 0,
}
```

## 核心文件

| 文件 | 用途 |
|------|------|
| `src/lib/auth/index.ts` | better-auth 配置，`getSession`，`getUserSettings`，用户生命周期钩子 |
| `src/lib/auth-client.ts` | 客户端认证操作 |
| `src/lib/auth/helpers/` | `getUserSettings`，`updateUserSettings` 等辅助函数 |
| `src/middleware.ts` | 检查 session cookie 是否存在 |

## 使用示例

### RSC / Route Handler

```typescript
import { getSession, getUserSettings } from '@/lib/auth';

const session = await getSession();
if (!session?.user?.id) {
  // 未登录
}

// 获取业务数据
const settings = await getUserSettings(session.user.id);
if (settings.subscription.active) {
  // 付费用户逻辑
}
```

### 客户端

```typescript
import { signIn, signOut, useSession } from '@/lib/auth-client';

// 登录
await signIn('google');
await signIn('github');

// 登出
await signOut();

// 获取 session（仅身份信息）
const { data: session } = useSession();
```

## 环境变量

| 变量 | 用途 |
|------|------|
| `BETTER_AUTH_SECRET` | 签名 cookies、加密数据 |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
