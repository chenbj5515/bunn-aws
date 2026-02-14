关于redis的信息都记录在这里，包括有哪些键值对，这些键值对代表什么，类型是什么等。
如果有任何变更都要把最新的信息更新到这个文件。

# Redis 键值对详细说明

本文档记录了系统中使用的所有Redis键值对，按功能分类整理。所有键都与用户ID关联，并根据用户类型（免费/付费）和时间周期（每日/每月/订阅周期）进行区分。

## 用户设置相关

| 键模式 | 类型 | 过期时间 | 说明 |
|-------|------|---------|-----|
| `user:{userId}:settings` | JSON | 24小时 | 存储用户设置，包括订阅状态、时区、成就点数、答题统计信息和界面语言偏好 |
| `user:{userId}:subscription:active` | String | 订阅周期 | 用户的订阅状态，值为"true"或"false" |
| `user:{userId}:safari:disliked_videos` | JSON Array | 30天 | 存储用户在Safari页面中不喜欢视频的videoId列表，用于过滤推荐内容 |

### user:{userId}:settings 数据结构

```json
{
  "subscription": {
    "active": true,
    "expireTime": "2025-01-01T00:00:00.000Z",
    "type": "subscription"
  },
  "timezone": "Asia/Shanghai",
  "achievementPoints": 100,
  "correctAnswersCount": 50,
  "totalAnswersCount": 100,
  "uiLocale": "en"
}
```

**字段说明**：
- `uiLocale`: 用户界面语言偏好，值为 `"en"`（英文）或 `"zh"`（中文），默认为 `"en"`

### user:{userId}:safari:disliked_videos 数据结构

```json
[
  "videoId1",
  "videoId2",
  "videoId3"
]
```

**说明**：
- 数组中的每个元素都是用户不喜欢视频的videoId（字符串类型）
- 当用户在Safari页面点击不喜欢按钮时，该视频的videoId会被添加到此数组
- Safari页面在加载时会检查此列表，并过滤掉用户不喜欢的内容
- 30天后自动过期，用户可以重新看到这些视频

**注意**：
- Redis中可能只存储部分字段（例如答题统计更新时只更新相关字段）
- `getUserSettings()` 函数会在读取时补充默认值：
  - `subscription` 默认为 `{active: false, expireTime: '', type: null}`
  - `achievementPoints` 默认为 `0`
  - `timezone` 默认为 `'Asia/Shanghai'`
  - `uiLocale` 默认为 `'en'`（界面语言偏好）
- 更新操作会保留所有现有字段，不会丢失数据

## 用户复习跟踪

基于用户时区的日期（格式：YYYY-MM-DD）生成键，在用户时区的次日凌晨5点自动过期。

| 键模式 | 类型 | 过期时间 | 说明 |
|-------|------|---------|-----|
| `review:{userId}:{YYYY-MM-DD}:memoCard` | String | 次日凌晨5点 | 用户当天memoCard复习完成状态，值为"completed" |
| `review:{userId}:{YYYY-MM-DD}:wordCard` | String | 次日凌晨5点 | 用户当天wordCard复习完成状态，值为"completed" |

## 图片上传跟踪

根据用户类型（免费/付费）使用不同的键和限制：

### 免费用户（每日限制）

| 键模式 | 类型 | 过期时间 | 说明 |
|-------|------|---------|-----|
| `image:free:{userId}:{YYYY-MM-DD}:count` | Integer | 次日凌晨5点 | 免费用户当天上传的图片数量，限制为3张/天 |

### 付费用户（订阅周期限制）

| 键模式 | 类型 | 过期时间 | 说明 |
|-------|------|---------|-----|
| `user:{userId}:subscription:tokens` | String | 订阅周期 | 付费用户在订阅周期内使用的token总数 |

## Google Vision API 使用量跟踪

根据用户类型（免费/付费）使用不同的键和限制：

### 免费用户（每日限制）

基于用户时区的日期（格式：YYYY-MM-DD）生成键，在用户时区的次日凌晨5点自动过期。每日限额为5次调用。

| 键模式 | 类型 | 过期时间 | 说明 |
|-------|------|---------|-----|
| `vision:{userId}:{YYYY-MM-DD}:count` | Integer | 次日凌晨5点 | 免费用户当天使用的谷歌Vision API次数 |

### 付费用户

付费用户无谷歌Vision API使用限制。

## "给我来点"功能使用量跟踪

基于用户类型（免费/付费）使用不同的限制：

### 免费用户（每日限制）

基于用户时区的日期（格式：YYYY-MM-DD）生成键，在用户时区的次日凌晨5点自动过期。每日限额为1次。

| 键模式 | 类型 | 过期时间 | 说明 |
|-------|------|---------|-----|
| `random-cards:{userId}:{YYYY-MM-DD}:count` | Integer | 次日凌晨5点 | 免费用户当天"给我来点"功能的使用次数 |

### 付费用户

付费用户无使用次数限制。

## Token使用量跟踪

根据用户类型（免费/付费）使用不同的键和限制：

### 免费用户（每日限制）

基于用户时区的日期（格式：YYYY-MM-DD）生成键，在用户时区的次日凌晨5点自动过期。每日限额为50,000 tokens。

| 键模式 | 类型 | 过期时间 | 说明 |
|-------|------|---------|-----|
| `token:{userId}:{YYYY-MM-DD}:input` | Integer | 次日凌晨5点 | 免费用户当天使用的输入tokens总数 |
| `token:{userId}:{YYYY-MM-DD}:output` | Integer | 次日凌晨5点 | 免费用户当天使用的输出tokens总数 |
| `token:{userId}:{YYYY-MM-DD}:{model}:input` | Integer | 次日凌晨5点 | 免费用户当天使用特定模型的输入tokens |
| `token:{userId}:{YYYY-MM-DD}:{model}:output` | Integer | 次日凌晨5点 | 免费用户当天使用特定模型的输出tokens |

### 付费用户（订阅周期限制）

订阅周期内限额为2,000,000 tokens。

| 键模式 | 类型 | 过期时间 | 说明 |
|-------|------|---------|-----|
| `user:{userId}:subscription:tokens:input` | Integer | 订阅周期 | 付费用户订阅周期内使用的输入tokens总数 |
| `user:{userId}:subscription:tokens:output` | Integer | 订阅周期 | 付费用户订阅周期内使用的输出tokens总数 |
| `user:{userId}:subscription:tokens:{model}:total` | Integer | 订阅周期 | 付费用户订阅周期内使用特定模型的tokens总数 |
| `user:{userId}:subscription:tokens:{model}:input` | Integer | 订阅周期 | 付费用户订阅周期内使用特定模型的输入tokens |
| `user:{userId}:subscription:tokens:{model}:output` | Integer | 订阅周期 | 付费用户订阅周期内使用特定模型的输出tokens |

## 数据验证方法

### 1. 使用Redis CLI验证

```bash
# 连接到Redis
redis-cli -u $REDIS_URL

# 查看用户设置
GET user:{userId}:settings

# 验证JSON格式是否正确
GET user:{userId}:settings | jq .

# 查看用户不喜欢视频列表
GET user:{userId}:safari:disliked_videos

# 验证不喜欢视频列表格式
GET user:{userId}:safari:disliked_videos | jq .
```

### 2. 在代码中临时添加调试

```typescript
// 在需要调试的地方临时添加
const settings = await redis.get(`user:${userId}:settings`);
console.log('Raw Redis data:', settings);
console.log('Parsed data:', parseUserSettings(settings));

// 调试Safari不喜欢视频功能
const dislikedVideos = await redis.get(`user:${userId}:safari:disliked_videos`);
console.log('Disliked videos:', dislikedVideos);
try {
  const dislikedList = JSON.parse(dislikedVideos || '[]');
  console.log('Parsed disliked videos:', dislikedList);
} catch (error) {
  console.error('Failed to parse disliked videos:', error);
}
```

### 3. 使用现有的调试页面

访问 `/[locale]/debug` 页面查看相关调试信息。

## 时间计算说明

系统根据用户时区计算键的过期时间：

1. **每日过期时间**：用户时区的次日凌晨5点
2. **订阅周期过期时间**：与用户订阅到期时间一致
3. **用户设置过期时间**：24小时（定期刷新活跃用户数据）

所有时间相关的键都考虑了用户所在时区，确保在用户的本地时间进行正确的重置和计算。

## AI 计费与用量统计 Key 规范（新增）

说明：以下 Key 仅用于“统计/展示/限额”，不影响业务功能；金额单位为 USD。

### 付费用户（订阅周期维度）
- `user:{userId}:subscription:tokens:cost:total`                       // 累计 USD（所有提供商总计）
- `user:{userId}:subscription:tokens:cost:openai:{model}`              // OpenAI 各模型累计 USD（如 gpt-4o, gpt-4o-mini）
- `user:{userId}:subscription:tokens:usage:openai:{model}:input`       // 累计 input tokens
- `user:{userId}:subscription:tokens:usage:openai:{model}:output`      // 累计 output tokens

- `user:{userId}:subscription:tokens:cost:minimax:tts`                 // MiniMax TTS 累计 USD
- `user:{userId}:subscription:tokens:usage:minimax:tts:chars`          // 累计字符数

- `user:{userId}:subscription:tokens:cost:redis:tts-cache:storage`     // Upstash 存储累计 USD（仅首次写入时计）
- `user:{userId}:subscription:tokens:cost:redis:tts-cache:requests`    // Upstash 请求累计 USD
- `user:{userId}:subscription:tokens:cost:redis:tts-cache:egress`      // Upstash 出站传输累计 USD
- `user:{userId}:subscription:tokens:usage:redis:tts-cache:bytes`      // TTS 缓存累计字节（原始二进制大小）
- `user:{userId}:subscription:tokens:usage:redis:tts-cache:requests`   // TTS 缓存累计命令数（GET/SET/DEL 等）
- `user:{userId}:subscription:tokens:usage:redis:tts-cache:egress`     // 出站传输累计字节
- `user:{userId}:subscription:tokens:usage:redis:tts-cache:ingress`    // 入站传输累计字节

> 说明：
> - 订阅用户 Key 与现有 token 统计的订阅周期 TTL 对齐。
> - 只在“首次写入缓存成功”时记存储成本，命中缓存不重复计费。
> - 传输字节为估算值：base64 体积≈原始×4/3。

### 免费用户（按天维度）
- `token:{userId}:{YYYY-MM-DD}:cost:total`
- `token:{userId}:{YYYY-MM-DD}:cost:openai:{model}`
- `token:{userId}:{YYYY-MM-DD}:usage:openai:{model}:input`
- `token:{userId}:{YYYY-MM-DD}:usage:openai:{model}:output`

- `token:{userId}:{YYYY-MM-DD}:cost:minimax:tts`
- `token:{userId}:{YYYY-MM-DD}:usage:minimax:tts:chars`

- `token:{userId}:{YYYY-MM-DD}:cost:redis:tts-cache:storage`
- `token:{userId}:{YYYY-MM-DD}:cost:redis:tts-cache:requests`
- `token:{userId}:{YYYY-MM-DD}:cost:redis:tts-cache:egress`
- `token:{userId}:{YYYY-MM-DD}:usage:redis:tts-cache:bytes`
- `token:{userId}:{YYYY-MM-DD}:usage:redis:tts-cache:requests`
- `token:{userId}:{YYYY-MM-DD}:usage:redis:tts-cache:egress`
- `token:{userId}:{YYYY-MM-DD}:usage:redis:tts-cache:ingress`

### TTS 缓存 Key（参考）
- `tts:cache:{voiceId}:{sha256(text)}`  // 有 voiceId 的缓存
- `tts:cache:{sha256(text)}`            // 纯文本缓存（向后兼容）
- 统一过期：30 天（如需差异 TTL，可在写入时独立设置）

