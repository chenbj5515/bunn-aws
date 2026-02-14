# 组件开发规范

本文档定义了项目中路由组件的书写规范。所有组件的开发和重构都应遵循这些原则。

## 目录结构

```
app/[locale]/[route-name]/
├── page.tsx                    # 服务端组件入口
├── _components/                # 客户端组件
│   ├── [route-name]-client/    # 复杂主组件（拆分为文件夹）
│   │   ├── index.tsx           # 主组件入口
│   │   ├── _components/        # 只有该组件用到的子组件
│   │   │   └── [sub-component].tsx
│   │   ├── _handlers/          # 只有该组件用到的流程函数
│   │   │   └── [feature]-handlers.ts
│   │   ├── _hooks/             # 只有该组件用到的 hooks
│   │   │   └── use-[hook-name].ts
│   │   └── reducer.ts          # 组件内部复杂状态（如需要）
│   ├── [sub-component]/        # 其他复杂子组件（同上结构）
│   │   └── ...
│   └── [simple-component].tsx  # 简单子组件（单文件）
├── _store/                     # 全局状态管理（多组件共享）
│   ├── index.ts                # 导出入口
│   ├── types.ts                # 类型定义
│   └── atoms.ts                # Jotai atoms
├── _hooks/                     # 多组件共享的 hooks
│   └── use-[hook-name].ts
├── _utils/                     # 多组件共享的工具函数
│   ├── constants.ts            # 常量定义
│   └── [feature]-utils.ts      # 功能相关工具
└── _server-functions/          # 服务端函数
    └── [action].ts
```

**重要原则**：只有多个组件公用的代码才放到 `_store`、`_hooks`、`_utils` 目录下。单个组件专用的代码应放在该组件自己的文件夹内，按类型组织到 `_components`、`_handlers`、`_hooks` 子文件夹中。

## 核心原则

### 原则 1：充分拆分子组件

**规则**：顶级组件的 JSX 中不应有超过 5 行的非组件模板代码。

```tsx
// ❌ 错误示例
function MyComponent() {
  return (
    <div className="...">
      <div className="header">
        <h1>{title}</h1>
        <button onClick={...}>Action</button>
        <span>{subtitle}</span>
      </div>
      <div className="content">
        <ul>
          {items.map(item => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ✅ 正确示例
function MyComponent() {
  return (
    <div className="...">
      <Header title={title} subtitle={subtitle} onAction={handleAction} />
      <ContentList items={items} />
    </div>
  );
}
```

### 原则 2：最小通信原则

**规则**：组件要细分，但组件之间保持最小通信、最少参数。

#### 2.1 状态就近原则

状态应该在使用它的组件内部直接从 store 读取，而不是从上层传递下来。

```tsx
// ❌ 错误：状态从上层获取后传递给子组件
function ParentComponent() {
  const currentVideoId = useAtomValue(currentVideoIdAtom);
  const currentVideoTitle = useAtomValue(currentVideoTitleAtom);
  const channelDetail = useAtomValue(channelDetailAtom);
  
  return (
    <ChildComponent
      videoId={currentVideoId}
      videoTitle={currentVideoTitle}
      channelDetail={channelDetail}
    />
  );
}

// ✅ 正确：子组件自己从 store 读取需要的状态
function ParentComponent() {
  return <ChildComponent />;
}

function ChildComponent() {
  // 组件自己读取需要的状态
  const currentVideoId = useAtomValue(currentVideoIdAtom);
  const currentVideoTitle = useAtomValue(currentVideoTitleAtom);
  const channelDetail = useAtomValue(channelDetailAtom);
  
  // ...
}
```

#### 2.2 自包含组件原则

组件应该是自包含的，自己管理所需的状态和回调逻辑，而不是依赖 props 传递。

```tsx
// ❌ 错误：回调逻辑在父组件定义，通过 props 传递
function ParentComponent() {
  const setCaptureState = useSetAtom(setCaptureStateAtom);
  
  const handleCapture = () => {
    setCaptureState({ isCapturing: true });
    // 执行截屏...
  };
  
  const handleCaptureError = (error: Error) => {
    setCaptureState({ isCapturing: false });
    if (isRateLimitError(error)) {
      setCaptureState({ showLimitRate: true });
    }
  };
  
  return (
    <CaptureButton onCapture={handleCapture} />
    <SubtitleCapture onError={handleCaptureError} />
  );
}

// ✅ 正确：组件内部处理自己的逻辑
function CaptureButton() {
  const triggerCapture = useSetAtom(triggerCaptureAtom);
  return <Button onClick={triggerCapture}>截屏</Button>;
}

function SubtitleCapture() {
  const setCaptureState = useSetAtom(setCaptureStateAtom);
  
  const handleError = (error: Error) => {
    setCaptureState({ isCapturing: false });
    if (isRateLimitError(error)) {
      setCaptureState({ showLimitRate: true });
    }
  };
  
  // ...
}
```

#### 2.3 通过 Store 通信

跨组件的交互应通过 Jotai store 而不是层层传递 props 或 ref。

```tsx
// ❌ 错误：通过 ref 跨组件调用方法
function ParentComponent() {
  const captureRef = useRef<CaptureRef>(null);
  
  const handleCapture = () => {
    captureRef.current?.capture();  // 通过 ref 调用
  };
  
  return (
    <>
      <CaptureButton onCapture={handleCapture} />
      <SubtitleCapture ref={captureRef} />
    </>
  );
}

// ✅ 正确：通过 store 触发
// 在 store 中添加一个请求计数器
export const triggerCaptureAtom = atom(null, (get, set) => {
  const state = get(captureStateAtom);
  set(captureStateAtom, {
    ...state,
    isCapturing: true,
    captureRequestCount: state.captureRequestCount + 1,
  });
});

function CaptureButton() {
  const triggerCapture = useSetAtom(triggerCaptureAtom);
  return <Button onClick={triggerCapture}>截屏</Button>;
}

function SubtitleCapture() {
  const captureRequestCount = useAtomValue(captureRequestCountAtom);
  
  useEffect(() => {
    if (captureRequestCount > 0) {
      // 执行截屏
    }
  }, [captureRequestCount]);
}
```

#### 2.4 Props 数量控制

- **0 props** 是最理想的状态（组件完全自包含）
- **1-3 props** 是可接受的
- **超过 5 props** 需要重新审视设计，考虑：
  - 子组件是否应该自己从 store 读取状态
  - 是否有些 props 可以合并为一个对象
  - 是否应该拆分为多个组件

```tsx
// ❌ 错误：过多 props
<SubtitleCaptureWrapper
  ref={subtitleCaptureRef}
  videoId={parsedPlayerVideoId}
  videoUrl={currentVideoUrl}
  videoTitle={currentVideoTitle}
  channelDetail={channelDetail}
  tvPlayerRef={tvPlayerRef}
  onCaptureEnd={() => setCaptureState({ isCapturing: false })}
  onSuccess={handleCaptureSuccess}
  onError={handleCaptureError}
/>

// ✅ 正确：最小 props（只传递必须的 ref）
<SubtitleCaptureWrapper tvPlayerRef={tvPlayerRef} />
```

### 原则 3：状态总线管理

**规则**：当多个组件需要共享状态时，使用 `_store` 文件夹创建 Jotai 状态管理。

```typescript
// _store/types.ts - 定义状态类型
export enum ViewPhase {
  IDLE = "idle",
  PLAYING = "playing",
  COMPLETED = "completed",
}

export interface ViewerState {
  phase: ViewPhase;
  currentVideoId: string;
  // ...
}

// _store/atoms.ts - 定义 atoms
export const viewerStateAtom = atom<ViewerState>(createInitialState());

// 派生状态
export const currentPhaseAtom = atom((get) => get(viewerStateAtom).phase);

// Action atoms
export const setVideoAtom = atom(
  null,
  (get, set, videoId: string) => {
    set(viewerStateAtom, { ...get(viewerStateAtom), currentVideoId: videoId });
  }
);
```

### 原则 4：组件内部复杂状态使用 useReducer

**规则**：当组件内部状态较复杂（超过 3 个相互关联的状态）时，使用 `useReducer` 并将 reducer 逻辑拆分到单独文件。

```typescript
// reducer.ts
export interface ComponentState {
  selectedAnswer: string | null;
  isSubmitted: boolean;
  // ...
}

export type ComponentAction =
  | { type: 'SELECT_ANSWER'; payload: { answer: string } }
  | { type: 'SUBMIT' }
  | { type: 'RESET' };

export const initialState: ComponentState = {
  selectedAnswer: null,
  isSubmitted: false,
};

export function componentReducer(
  state: ComponentState,
  action: ComponentAction
): ComponentState {
  switch (action.type) {
    case 'SELECT_ANSWER':
      return { ...state, selectedAnswer: action.payload.answer };
    case 'SUBMIT':
      return { ...state, isSubmitted: true };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}
```

### 原则 5：业务逻辑拆分为流程函数

**规则**：每个组件的业务逻辑应拆分为几个主要流程函数，组件函数体内不应有超过 5 行的非函数调用代码。

```tsx
// ============================================
// 核心流程函数
// ============================================

/**
 * 1. 初始化 - 加载初始数据
 */
function initializeData(dispatch: Dispatch, data: Data[]): void {
  const processedData = processData(data);
  dispatch({ type: 'INITIALIZE', payload: processedData });
}

/**
 * 2. 选择项目 - 处理用户选择
 */
function selectItem(dispatch: Dispatch, itemId: string): void {
  dispatch({ type: 'SELECT_ITEM', payload: { itemId } });
}

/**
 * 3. 提交 - 处理提交逻辑
 */
function submitData(dispatch: Dispatch, state: State): void {
  validateData(state);
  saveData(state);
  dispatch({ type: 'SUBMIT' });
}

// ============================================
// 组件
// ============================================

function MyComponent({ data }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 初始化
  useEffect(() => {
    initializeData(dispatch, data);
  }, [data]);

  // 事件处理器（只调用流程函数）
  const handleSelect = (itemId: string) => selectItem(dispatch, itemId);
  const handleSubmit = () => submitData(dispatch, state);

  return (
    <Container>
      <ItemList items={state.items} onSelect={handleSelect} />
      <ActionPanel onSubmit={handleSubmit} />
    </Container>
  );
}
```

### 原则 6：工具函数提取

**规则**：所有可复用的工具函数都应提取到 `_utils` 目录下的对应文件中。

```typescript
// _utils/video-utils.ts
export function parseVideoUrl(url: string): { videoId: string; startTime: number } {
  // ...
}

export function formatDuration(seconds: number): string {
  // ...
}

export function generateMarkers(memoCards: MemoCard[]): Marker[] {
  // ...
}

// _utils/keyboard-utils.ts
export function createKeyboardHandler(config: KeyboardConfig): (e: KeyboardEvent) => void {
  // ...
}

// _utils/constants.ts
export const VIDEO_PLAYER_CONFIG = {
  DEFAULT_SEEK_TIME: 5,
  MAX_PLAY_COUNT: 3,
} as const;
```

### 原则 7：单文件不超过 300 行

**规则**：任何单个文件的代码行数不应超过 300 行。当文件超过此限制时，应将其拆分为多个文件。

**拆分策略**：
1. **组件文件过大**：将组件拆分为文件夹，主组件放 `index.tsx`，子组件、hooks、handlers 分别放独立文件
2. **工具函数文件过大**：按功能领域拆分为多个 `-utils.ts` 文件
3. **类型文件过大**：按领域拆分为多个 `types.ts` 文件

```
# ❌ 错误：单文件 450 行
video-viewer-client.tsx (450 lines)

# ✅ 正确：拆分为文件夹，按类型组织
video-viewer-client/
├── index.tsx                           # 主组件入口 (~190 lines)
├── _components/                        # 子组件
│   └── subtitle-capture-wrapper.tsx    # (~45 lines)
├── _handlers/                          # 流程函数
│   ├── video-handlers.ts               # (~100 lines)
│   ├── capture-handlers.ts             # (~30 lines)
│   └── memo-card-handlers.ts           # (~20 lines)
└── _hooks/                             # hooks
    └── use-keyboard-control.ts         # (~50 lines)
```

## 状态管理选择指南

| 场景 | 推荐方案 |
|------|----------|
| 单个组件的简单状态（1-2 个独立状态） | `useState` |
| 单个组件的复杂状态（3+ 个相互关联的状态） | `useReducer` |
| 多个组件共享状态 | Jotai `_store` |
| 表单状态 | `react-hook-form` |
| 服务端数据缓存 | React Server Components 或 SWR |

## 命名规范

| 类型 | 命名规范 | 示例 |
|------|----------|------|
| 组件文件 | kebab-case | `video-title-bar.tsx` |
| 组件名 | PascalCase | `VideoTitleBar` |
| 流程函数 | camelCase，动词开头 | `initializeQuestions`, `submitAnswer` |
| Action 类型 | SCREAMING_SNAKE_CASE | `SELECT_ANSWER`, `SUBMIT` |
| Atom 名称 | camelCase + Atom 后缀 | `currentVideoAtom`, `setVideoAtom` |
| 常量 | SCREAMING_SNAKE_CASE | `MAX_PLAY_COUNT` |

## 组件类型声明

**规则**：不使用 `FC`（`React.FC` / `React.FunctionComponent`），直接声明函数组件。

```tsx
// ❌ 不推荐
import { FC } from 'react';

const MyComponent: FC<Props> = ({ name }) => {
  return <div>{name}</div>;
};

// ✅ 推荐
interface Props {
  name: string;
}

function MyComponent({ name }: Props) {
  return <div>{name}</div>;
}
```

**原因**：
- React 18 后 `FC` 不再自动包含 `children`，失去了主要优势
- 直接声明函数让 TypeScript 能更好地推断返回类型
- 代码更简洁，少一层类型包装

## 默认导出组件

**规则**：使用 `export default` 导出组件时，直接在函数声明处导出，不要先定义变量再单独导出。

```tsx
// ❌ 不推荐：先定义变量再导出
const MyPage = async ({ params }: Props) => {
  return <div>...</div>;
};

export default MyPage;

// ✅ 推荐：直接导出
export default async function MyPage({ params }: Props) {
  return <div>...</div>;
}
```

**原因**：
- 代码更简洁，减少不必要的中间变量
- 意图更明确，一眼就能看出这是默认导出的组件
- 避免变量命名和导出名不一致的问题

## forwardRef 组件

**规则**：使用 `forwardRef` 时，使用命名函数而不是箭头函数，这样不需要手动设置 `displayName`。

```tsx
// ❌ 不推荐：箭头函数需要手动设置 displayName
export const MyInput = forwardRef<HTMLInputElement, Props>(
  (props, ref) => {
    return <input ref={ref} {...props} />;
  }
);
MyInput.displayName = 'MyInput';

// ✅ 推荐：命名函数自动获取名称
export const MyInput = forwardRef<HTMLInputElement, Props>(
  function MyInput(props, ref) {
    return <input ref={ref} {...props} />;
  }
);
```

## 组件拆分判断标准

当遇到以下情况时，应考虑将代码拆分为子组件：

1. **JSX 超过 5 行**：考虑拆分为子组件
2. **重复的 UI 模式**：抽取为可复用组件
3. **独立的交互逻辑**：如按钮组、表单字段
4. **条件渲染的大块内容**：如弹窗、加载状态
5. **列表项**：如卡片、列表行

## 示例：复杂组件重构前后对比

### 重构前（问题：状态提升过度 + props 泛滥）

```tsx
// 200+ 行的组件，大量状态和回调通过 props 传递
function VideoViewerClientInner({ channelDetail, ... }) {
  // 从 store 读取很多状态，但只是为了传给子组件
  const currentVideoId = useAtomValue(currentVideoIdAtom);
  const currentVideoTitle = useAtomValue(currentVideoTitleAtom);
  const currentVideoUrl = useAtomValue(currentVideoUrlAtom);
  const videos = useAtomValue(videosAtom);
  const selectedMemoCard = useAtomValue(selectedMemoCardAtom);
  // ... 更多状态

  // 大量事件处理器，只是调用 store 方法后传给子组件
  const handleVideoSelect = (videoId, videoTitle) => {
    setCurrentVideo({ videoId, videoTitle });
    router.replace(...);
  };

  const handleDeleteChannel = async () => { /* 删除逻辑 */ };
  const handleCapture = () => { /* 截屏逻辑 */ };
  const handleDeleteMemoCard = async () => { /* 删除卡片逻辑 */ };
  const handlePlayFromMarker = () => { /* 播放逻辑 */ };

  return (
    <div>
      {/* 大量 props 传递 */}
      <VideoTitleBar onVideoSelect={handleVideoSelect} />
      <TvPlayerSection
        onDeleteChannel={handleDeleteChannel}
        onCapture={handleCapture}
      />
      <MemoCardModal 
        onDelete={handleDeleteMemoCard} 
        onPlayVideo={handlePlayFromMarker} 
      />
      <SubtitleCaptureWrapper
        videoId={parsedPlayerVideoId}
        videoUrl={currentVideoUrl}
        videoTitle={currentVideoTitle}
        channelDetail={channelDetail}
        onCaptureEnd={...}
        onSuccess={...}
        onError={...}
      />
    </div>
  );
}
```

### 重构后（最小通信 + 自包含组件）

```tsx
// video-viewer-client/index.tsx - ~100 行
// 父组件只负责初始化 store 和组装子组件
function VideoViewerClientInner({ channelDetail, memoCardList, ... }) {
  const tvPlayerRef = useRef<TvPlayerSectionHandle>(null);

  // 初始化 store
  useHydrateAtoms([
    [channelDetailAtom, channelDetail],
    [memoCardListAtom, memoCardList],
    // ...
  ], { store });

  // 只读取这个组件真正需要的状态
  const showLimitRate = useAtomValue(showLimitRateAtom);
  const setCaptureState = useSetAtom(setCaptureStateAtom);

  // 键盘控制 hook 自己从 store 读取需要的状态
  useKeyboardControl({ tvPlayerRef });

  return (
    <div className="fixed inset-0">
      {/* 零 props 或最少 props */}
      <VideoTitleBar />
      <TvPlayerSection ref={tvPlayerRef} />
      <MemoCardModal tvPlayerRef={tvPlayerRef} />
      <SubtitleCaptureWrapper tvPlayerRef={tvPlayerRef} />
      <LimitRate show={showLimitRate} onClose={() => setCaptureState({ showLimitRate: false })} />
    </div>
  );
}

// 子组件是自包含的，自己从 store 读取状态和处理逻辑
// video-title-bar.tsx
function VideoTitleBar() {
  const setCurrentVideo = useSetAtom(setCurrentVideoAtom);
  const router = useRouter();
  const pathname = usePathname();
  
  const handleVideoSelect = (videoId, videoTitle) => {
    setCurrentVideo({ videoId, videoTitle });
    router.replace(...);
  };
  
  return <VideoList onSelect={handleVideoSelect} ... />;
}

// delete-video-button.tsx
function DeleteVideoButton() {
  const channelDetail = useAtomValue(channelDetailAtom);
  const setDeleteState = useSetAtom(setDeleteStateAtom);
  
  const handleDelete = async () => {
    // 删除逻辑完全在这个组件内部
  };
  
  return <Button onClick={handleDelete}>删除</Button>;
}
```

**重构收益**：
- 父组件从 ~200 行减少到 ~100 行
- 子组件 props 从 5-8 个减少到 0-1 个
- 每个组件职责单一，易于维护和测试
- 通过 store 通信，避免 props drilling

## 检查清单

在提交代码前，请确认：

**文件结构**
- [ ] 单个文件不超过 300 行
- [ ] 单组件专用代码放在组件文件夹内，共享代码放在 _store/_hooks/_utils
- [ ] 文件命名和组件命名符合规范

**组件设计**
- [ ] 顶级组件 JSX 中非组件代码不超过 5 行
- [ ] 组件 props 数量控制在 3 个以内（超过 5 个必须重构）
- [ ] 组件是自包含的，自己从 store 读取需要的状态
- [ ] 避免通过 props 层层传递回调函数，改用 store 触发

**状态管理**
- [ ] 共享状态使用 _store 目录管理
- [ ] 组件复杂状态使用 useReducer 并拆分 reducer.ts
- [ ] 状态就近原则：状态在使用它的组件内部读取，不从上层传递
- [ ] 跨组件通信使用 store，避免 ref 调用

**代码组织**
- [ ] 业务逻辑按流程函数组织，函数体不超过 5 行非函数调用
- [ ] 工具函数已提取到 _utils 目录（仅共享代码）
- [ ] forwardRef 组件使用命名函数，不使用 displayName
