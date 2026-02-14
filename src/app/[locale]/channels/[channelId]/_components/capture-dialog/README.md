# CaptureDialog 截屏对话框

## 概述

截屏对话框是一个状态驱动的组件，根据 `capturePhaseAtom` 的状态分发渲染不同的子视图。

## 状态流转图

```
正常流程：

  Idle                RequestingPermission          Capturing             Extracting
  (空闲) ──────────→ (请求屏幕权限) ──────────→ (截取屏幕) ──────────→ (识别字幕)
                                                                            │
    ┌───────────────────────────────────────────────────────────────────────┘
    │
    ▼
  SubtitleReady            CreatingCard              Completed
  (字幕就绪) ──────────→ (创建卡片中) ──────────→ (创建成功) ──────────→ Idle (重置)


异常分支：

  Extracting / SubtitleReady / CreatingCard
         │
         ├──→ Error (出错) ──────────→ Idle (关闭后重置)
         │
         └──→ RateLimited (限流) ────→ Idle (关闭后重置)


  RequestingPermission
         │
         └──→ Idle (用户取消授权)
```

## 状态 → 组件映射

```
┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────────────────────────┐
│ 状态                 │ Dialog 是否显示      │ 组件                 │ 组件说明                                 │
├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────────────────────────┤
│ Idle                 │ ❌ 不显示            │ -                    │ 空闲状态，无 UI                          │
│ RequestingPermission │ ❌ 不显示            │ -                    │ 系统权限弹窗，无自定义 UI                │
│ Capturing            │ ❌ 不显示            │ -                    │ 截屏进行中，不显示避免截到蒙层           │
│ Extracting           │ ✅ 显示              │ ExtractingView       │ 字幕识别中：loading + 截图预览           │
│ SubtitleReady        │ ✅ 显示              │ SubtitleReadyView    │ 字幕就绪：可编辑字幕 + 创建按钮          │
│ CreatingCard         │ ✅ 显示              │ SubtitleReadyView    │ 同上，按钮显示 loading 状态              │
│ Completed            │ ✅ 显示              │ CompletedView        │ 完成：展示卡片内容 + 确认按钮            │
│ Error                │ ✅ 显示              │ ErrorView            │ 错误：错误信息 + 截图预览 + 关闭按钮     │
│ RateLimited          │ ✅ 显示              │ RateLimitedView      │ 限流：升级提示 banner                    │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────────────────────────┘
```

## 主组件职责

根据 `capturePhaseAtom` 状态分发渲染对应子组件。
