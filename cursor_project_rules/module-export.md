# 模块导出规范

## index.ts 导出规则

如果要创建 `index.ts` 作为模块入口，**必须使用全量导出**，不要使用具名导出。

```typescript
// ✅ 正确：全量导出
export * from './rate-limited';
export * from './admin-only';

// ❌ 错误：具名导出
export { rateLimitedProcedure } from './rate-limited';
export { adminOnlyProcedure } from './admin-only';
```

## 原则

- 要么用 `export *` 全量导出
- 要么不创建 `index.ts`，直接从具体文件导入

## 原因

- 具名导出需要维护两处（源文件 + index.ts），容易遗漏
- 全量导出自动同步，新增导出无需修改 index.ts
