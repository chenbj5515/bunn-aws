# AI 调用规范

## 铁律：禁止直接调用 AI，必须经 tRPC

**所有 AI 相关调用（OpenAI、generateText、@ai-sdk 等）必须通过 tRPC procedures 进行。**

### 规则

1. **唯一合法调用点**：`src/lib/trpc/routers/ai/` 下的 procedure 文件
2. **禁止行为**：在 server-functions、components、lib 等其他任何地方直接 import 并调用：
   - `generateText` (from 'ai')
   - `openai` / `@ai-sdk/openai`
   - 其他 AI 模型的 SDK
3. **正确用法**：业务代码通过 `getServerTrpc()` 或客户端 trpc 调用对应 procedure
4. **用量追踪**：tRPC procedure 内使用 `trackUsage` / `after(() => trackUsage(...))` 记录用量

### 现有 AI 相关 procedures

- `ai.extractSubtitles` - 字幕提取
- `ai.translateAndRuby` - 翻译与 Ruby 注音
- `ai.generateWordDistractions` - 单词干扰项生成
- `ai.generateMultilingualMeaning` - 单词多语言意思
- `ai.translateQuestion` - 问题多语言翻译

### 错误处理

- 返回值统一结构：`errorCode: null` 为成功，`errorCode: number` 为预料中失败
- 详见 `cursor_project_rules/error-handling.md`

### 新增 AI 需求时

1. 在 `lib/trpc/routers/ai/` 新增或扩展 procedure
2. 使用 `rateLimitedProcedure` 做用量限制
3. 在 procedure 内调用 `generateText` / AI SDK
4. 返回结构遵循 `errorCode` 约定
5. 业务侧通过 `getServerTrpc().ai.xxx()` 调用
