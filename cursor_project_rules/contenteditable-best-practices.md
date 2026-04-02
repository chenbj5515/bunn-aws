# contentEditable 最佳实践

## 问题：输入从右往左（光标跳转/内容反向）

当使用 React 的 `contentEditable` 元素时，如果将 state 作为子节点渲染，会导致：
- 输入时文字从右往左显示
- 光标位置跳转
- IME 输入法异常

### 错误示例

```tsx
// ❌ 错误：将 state 作为 children 渲染
const [text, setText] = useState("初始值");

<div
  contentEditable
  onInput={(e) => setText(e.currentTarget.textContent ?? "")}
>
  {text}  {/* 这会导致每次输入触发 React 重新渲染，光标位置混乱 */}
</div>
```

### 正确示例

```tsx
// ✅ 正确：使用 ref 管理内容，不使用 React children
const [text, setText] = useState("初始值");
const textRef = useRef<HTMLDivElement>(null);
const isFocusedRef = useRef(false);

// 仅在非编辑状态下同步外部值
useEffect(() => {
  if (textRef.current && !isFocusedRef.current) {
    textRef.current.textContent = text;
  }
}, [text]);

// 初始化内容
useEffect(() => {
  setTimeout(() => {
    if (textRef.current) {
      textRef.current.textContent = initialValue;
    }
  }, 0);
}, [initialValue]);

<div
  ref={textRef}
  dir="ltr"  // 强制左到右方向
  contentEditable
  suppressContentEditableWarning
  onFocus={() => {
    isFocusedRef.current = true;
  }}
  onInput={(e) => {
    setText(e.currentTarget.textContent ?? "");
  }}
  onBlur={() => {
    isFocusedRef.current = false;
    // 在这里处理保存逻辑
  }}
  onClick={(e) => e.stopPropagation()}
  onMouseDown={(e) => e.stopPropagation()}
  onKeyDown={(e) => e.stopPropagation()}
  onKeyUp={(e) => e.stopPropagation()}
/>  {/* 注意：没有 children！使用自闭合标签 */}
```

## 核心原则

1. **永远不要将 state 作为 contentEditable 的 children**
   - React 会在 state 变化时重新渲染，导致 DOM 被替换
   - 这会重置光标位置，造成输入异常

2. **使用 ref 直接操作 DOM**
   - 通过 `ref.current.textContent = value` 设置内容
   - 仅在用户未聚焦时同步外部值

3. **使用 focus ref 追踪编辑状态**
   - `onFocus` 时设置 `isFocusedRef.current = true`
   - `onBlur` 时设置 `isFocusedRef.current = false`
   - 同步外部值前检查 `!isFocusedRef.current`

4. **添加 `dir="ltr"` 属性**
   - 强制文本方向为从左到右
   - 避免某些浏览器的 RTL 推断问题

5. **阻止事件冒泡**
   - `onClick`, `onMouseDown`, `onKeyDown`, `onKeyUp` 都需要 `e.stopPropagation()`
   - 防止全局事件监听器干扰输入

6. **初始化时使用 setTimeout**
   - 确保 ref 已挂载后再设置内容
   - `setTimeout(() => { ref.current.textContent = value }, 0)`

## 检查清单

- [ ] contentEditable 元素使用自闭合标签（无 children）
- [ ] 使用 ref 设置 textContent
- [ ] 添加 isFocusedRef 追踪焦点状态
- [ ] 添加 `dir="ltr"` 属性
- [ ] 添加 `suppressContentEditableWarning` 消除 React 警告
- [ ] 所有交互事件调用 `e.stopPropagation()`
- [ ] 初始化内容使用 setTimeout 确保 ref 已挂载
