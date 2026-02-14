# 错误处理规范

## 一、核心原则

所有**预期内的失败**（限流、AI 输出格式错误、解析失败等）一律**返回 JSON**，不 throw。  
**意料外的异常**（bug、网络故障、未捕获错误）暂不特别处理，沿用默认行为（throw）。

---

## 二、统一响应结构

所有 tRPC procedure 返回值：

| 情况 | 结构 |
|------|------|
| **成功** | `errorCode: null` + 业务数据字段 |
| **预料中失败** | `errorCode: number`，通过 errorCode 识别错误类型 |
| **意料外失败** | throw（暂不处理） |

- 无 `success` / `rateLimited` 等 flag，仅用 `errorCode` 区分
- 无 `reason` 字段，避免暴露内部信息
- 成功时业务字段与现有约定一致

---

## 三、errorCode 分层设计

### 3.1 全局错误码

| errorCode | 含义 |
|-----------|------|
| 3001 | 限流（TOKEN_LIMIT_EXCEEDED） |

### 3.2 Router 专属错误码

各 router 在固定区间内定义自己的 code：

| 区间 | Router | 错误码示例 |
|------|--------|------------|
| 310x | extractSubtitles | 3101 解析失败, 3102 格式错误, 3103 无内容, 3104 过长 |
| 320x | translateAndRuby | 3201 解析失败 |
| 330x | generateWordDistractions | 3301 意思格式错误, 3302 发音格式错误 |
| 340x | generateMultilingualMeaning | 3401 输入无效, 3402 解析失败 |
| 350x | translateQuestion | 3501 解析失败 |

---

## 四、调用端约定

```typescript
const result = await trpc.ai.xxx.mutate(input);

if (result.errorCode !== null) {
  // 预料中失败，根据 result.errorCode 处理
  if (result.errorCode === ERROR_CODES.TOKEN_LIMIT_EXCEEDED) {
    // 限流
  }
  return;
}

// 成功，使用 result 中的业务数据
```
