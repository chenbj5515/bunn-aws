# Next.js 组件重要规则

## generateStaticParams

在 Next.js 的应用路由中使用动态段（如 `[locale]` 和 `[slug]`）时，`generateStaticParams` 函数**必须返回一个 Promise**。

```typescript
export async function generateStaticParams() {
  // 获取参数
  const params = [];
  // 填充参数...
  
  // 必须使用 Promise.resolve 明确返回一个 Promise
  return Promise.resolve(params);
}
```

即使 params 本身是一个普通数组，也必须通过 `Promise.resolve()` 包装返回，确保函数返回值为 Promise 类型。这是 Next.js 静态生成路由的重要规范。

## 注意事项

- 不遵循此规则可能导致构建或静态生成错误
- 这是项目的强制性规范，所有使用动态路由段的页面必须遵循
- 不要直接返回参数数组，一定要用 Promise.resolve() 包装
