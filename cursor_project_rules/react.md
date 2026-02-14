# React 开发约束规则

## 🚫 禁用规则

### 1. 绝对禁止使用 useMemo 和 useCallback

- **严格禁止**在任何情况下使用 `useMemo` 和 `useCallback`
- 这些优化Hook经常被误用，导致代码复杂化而性能提升微乎其微
- 过早优化是万恶之源，应该专注于代码的可读性和可维护性

```typescript
// ❌ 禁止
const memoizedValue = useMemo(() => expensiveCalculation(a, b), [a, b]);
const memoizedCallback = useCallback(() => doSomething(a, b), [a, b]);

// ✅ 推荐 - 直接使用
const value = expensiveCalculation(a, b);
const handleClick = () => doSomething(a, b);
```

### 2. 限制 useEffect 使用

- **除非绝对必要，否则不要使用 useEffect**
- useEffect 经常被滥用，导致组件逻辑复杂和难以调试
- 大多数情况下可以通过事件处理器、状态管理或其他方式替代

```typescript
// ❌ 避免 - 不必要的 useEffect
useEffect(() => {
  setCount(count + 1);
}, [someValue]);

// ✅ 推荐 - 在事件处理器中直接处理
const handleSomeAction = () => {
  setCount(prev => prev + 1);
};
```

**仅在以下情况下使用 useEffect：**
- 与外部系统同步（API调用、DOM操作、订阅）
- 清理资源（取消订阅、清除定时器）
- 组件挂载/卸载时的一次性操作

## ✅ 推荐规则

### 3. 优先使用 useReducer 进行状态管理

- **尽量使用 useReducer** 替代复杂的 useState
- 将业务逻辑抽象成：**状态(State)**、**动作(Action)**、**副作用(Effects)**
- 使状态变更更加可预测和易于测试

```typescript
// ✅ 推荐的 useReducer 模式
interface State {
  items: Item[];
  loading: boolean;
  error: string | null;
}

type Action = 
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Item[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'ADD_ITEM'; payload: Item }
  | { type: 'REMOVE_ITEM'; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, items: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(item => item.id !== action.payload) };
    default:
      return state;
  }
}

// 在组件中使用
function ItemList() {
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    loading: false,
    error: null
  });

  const fetchItems = async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const items = await api.getItems();
      dispatch({ type: 'FETCH_SUCCESS', payload: items });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: error.message });
    }
  };

  const addItem = (item: Item) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  };

  return (
    // JSX...
  );
}
```

## 📋 最佳实践

### 状态管理三原则

1. **状态(State)** - 定义清晰的数据结构
2. **动作(Action)** - 描述所有可能的状态变更
3. **副作用(Effects)** - 异步操作和外部交互

### 何时使用 useState vs useReducer

```typescript
// ✅ useState - 简单状态
const [count, setCount] = useState(0);
const [isOpen, setIsOpen] = useState(false);

// ✅ useReducer - 复杂状态逻辑
const [state, dispatch] = useReducer(reducer, initialState);
```

**使用 useReducer 的信号：**
- 状态对象包含多个相关字段
- 需要复杂的状态更新逻辑
- 状态更新依赖于当前状态
- 需要在多个组件间共享状态逻辑

## 🔧 工具和辅助

### 自定义 Hook 模式

```typescript
// ✅ 推荐 - 封装业务逻辑的自定义 Hook
function useItemManager() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = {
    fetchItems: async () => {
      dispatch({ type: 'FETCH_START' });
      try {
        const items = await api.getItems();
        dispatch({ type: 'FETCH_SUCCESS', payload: items });
      } catch (error) {
        dispatch({ type: 'FETCH_ERROR', payload: error.message });
      }
    },
    addItem: (item: Item) => dispatch({ type: 'ADD_ITEM', payload: item }),
    removeItem: (id: string) => dispatch({ type: 'REMOVE_ITEM', payload: id }),
  };

  return { state, actions };
}
```

## ⚠️ 重要提醒

- 这些规则旨在提高代码质量和可维护性
- 优先考虑代码的清晰性而非过早优化
- 所有状态管理都应该是可预测和可测试的
- 遇到性能问题时，首先分析根本原因，而不是盲目添加优化Hook
