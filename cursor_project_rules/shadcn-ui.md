# shadcn/ui 组件定制规范

本文档记录 shadcn/ui 组件使用中的常见问题和定制方案。

## Dialog 组件

### 问题：关闭按钮自动获得焦点（显示灰色边框）

**现象**：Dialog 打开时，右上角关闭按钮自动获得焦点，显示灰色的 focus ring 边框。

**解决方案**：

1. **移除关闭按钮的 focus ring 样式**

在 `src/components/ui/dialog.tsx` 中，修改关闭按钮的 className：

```tsx
// ❌ 原始样式（有 focus ring）
className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none ..."

// ✅ 修复后样式（移除 focus ring）
className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none ..."
```

2. **阻止 Dialog 自动聚焦**（可选，作为额外保险）

在使用 DialogContent 时添加 `onOpenAutoFocus`：

```tsx
<DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
  {/* 内容 */}
</DialogContent>
```

**已应用**：`src/components/ui/dialog.tsx` 已按此方案修改。

---

## AlertDialog 组件

AlertDialog 与 Dialog 类似，如果遇到相同问题，参考 Dialog 的解决方案。

---

## Sheet 组件

Sheet 组件（侧边抽屉）也可能有类似的 focus ring 问题，处理方式与 Dialog 相同。

---

## 通用原则

### Focus 样式处理

对于不需要键盘导航提示的装饰性按钮（如关闭按钮），应该：
- 移除 `focus:ring-*` 相关样式
- 保留 `focus:outline-none` 以移除默认 outline

对于功能性按钮（如表单提交按钮），应该保留 focus 样式以支持键盘可访问性。

### 安装新组件后的检查清单

使用 `pnpm dlx shadcn@latest add <component>` 安装新组件后：

1. [ ] 检查是否有不必要的 focus ring 样式
2. [ ] 检查自动聚焦行为是否符合预期
3. [ ] 如有问题，参照本文档进行定制
