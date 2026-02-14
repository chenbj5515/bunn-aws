# AI 调用规范

## 铁律：禁止直接调用 AI，必须经统一入口

**所有 AI 相关调用（OpenAI、generateText、@ai-sdk 等）必须通过指定的入口进行。**

### 规则

1. **合法调用点**：
   - **非流式调用**：`src/lib/trpc/routers/ai/` 下的 procedure 文件
   - **流式调用**：`src/app/api/ai/` 下的 API Route 文件
2. **禁止行为**：在 server-functions、components、lib 等其他任何地方直接 import 并调用：
   - `generateText` / `streamText` (from 'ai')
   - `openai` / `@ai-sdk/openai`
   - 其他 AI 模型的 SDK
3. **正确用法**：
   - 非流式：业务代码通过 `getServerTrpc()` 或客户端 trpc 调用对应 procedure
   - 流式：客户端通过 `fetch('/api/ai/chat')` 调用，使用 ReadableStream 处理响应
4. **用量追踪**：在入口处使用 `trackUsage` / `after(() => trackUsage(...))` 记录用量

### 现有 AI 入口

#### tRPC Procedures（非流式）

- `ai.extractSubtitles` - 字幕提取
- `ai.translateAndRuby` - 翻译与 Ruby 注音
- `ai.generateWordDistractions` - 单词干扰项生成
- `ai.generateMultilingualMeaning` - 单词多语言意思
- `ai.translateQuestion` - 问题多语言翻译

#### API Routes（流式）

- `POST /api/ai/chat` - 流式 AI 对话（使用 Vercel AI SDK 的 Data Stream 格式）

### 为什么流式调用不用 tRPC？

tRPC v11 的 `iterablesAndDeferreds` 实验性特性虽然支持 async generator，但 `mutate()` 返回的是 `Promise<TOutput>` 而非 `AsyncIterable`，不适合真正的流式 UI 场景。

使用 Next.js API Route + Vercel AI SDK 的 `toTextStreamResponse()` 是更稳定和推荐的流式方案。

### 错误处理

- 返回值统一结构：`errorCode: null` 为成功，`errorCode: number` 为预料中失败
- 详见 `cursor_project_rules/error-handling.md`

### 新增 AI 需求时

#### 非流式需求

1. 在 `lib/trpc/routers/ai/` 新增或扩展 procedure
2. 使用 `rateLimitedProcedure` 做用量限制
3. 在 procedure 内调用 `generateText` / AI SDK
4. 返回结构遵循 `errorCode` 约定
5. 业务侧通过 `getServerTrpc().ai.xxx()` 调用

#### 流式需求

1. 在 `app/api/ai/` 下新增 API Route
2. 使用 `checkLimit()` 检查配额
3. 使用 `streamText()` 创建流式响应
4. 使用 `trackUsage()` + `after()` 追踪用量
5. 客户端使用 `fetch` + `ReadableStream` 处理响应
