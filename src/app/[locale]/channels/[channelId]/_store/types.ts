import type { InferSelectModel } from "drizzle-orm";
import type { memoCard } from "@/lib/db/schema";

/**
 * 视频信息
 */
export interface VideoInfo {
  videoId: string;
  videoTitle: string | null;
}

/**
 * 频道详情
 */
export interface ChannelDetail {
  channelId: string;
  channelName: string;
  avatarUrl?: string | null;
  description: string | null;
  bannerUrl: string | null;
  channelUrl: string;
}

/**
 * 带频道信息的记忆卡片
 */
export interface MemoCardWithChannel extends Omit<InferSelectModel<typeof memoCard>, 'chapterId' | 'translation'> {
  translation: Record<string, string> | string;
  channelId: string;
  videoId: string;
  videoTitle: string | null;
}

/**
 * 进度条标记点
 */
export interface Marker {
  id: string;
  contextUrl: string;
  avatarUrl?: string | null;
  title: string;
  order: number;
}

/**
 * 视频查看器状态
 */
export interface VideoViewerState {
  /** 当前视频 ID */
  currentVideoId: string;
  /** 当前视频标题 */
  currentVideoTitle: string | null;
  /** 视频列表 */
  videos: VideoInfo[];
  /** 过滤后的视频列表 */
  filteredVideos: VideoInfo[];
  /** 视频时长 */
  videoDuration: number;
  /** 播放状态 */
  isVideoPaused: boolean;
  /** 是否播放过 */
  hasEverPlayed: boolean;
  /** 视频列表是否打开 */
  videoListOpen: boolean;
  /** 是否正在选择 */
  isSelecting: boolean;
  /** 选择器位置 */
  selectorPosition: { top: number; left: number; width: number };
}

/**
 * 记忆卡片展示状态
 */
export interface MemoCardDisplayState {
  /** 是否显示记忆卡片 */
  showMemoCard: boolean;
  /** 选中的记忆卡片 ID */
  selectedMemoCardId: string;
}

/**
 * 截屏失败原因枚举
 */
export enum CaptureFailureReason {
  /** 用户取消了屏幕共享 */
  PermissionDenied = 'permission_denied',
  /** 无法获取截图 */
  NoVideoTrack = 'no_video_track',
  /** 没有识别到字幕 */
  NoSubtitle = 'no_subtitle',
  /** 今日使用次数已达上限 */
  RateLimited = 'rate_limited',
  /** 操作状态异常 */
  InvalidState = 'invalid_state',
  /** 未知错误 */
  Error = 'error',
}

/**
 * 截屏流程阶段枚举
 */
export enum CaptureStage {
  /** 空闲状态 */
  Idle = 'idle',
  /** 请求屏幕共享权限 */
  RequestingPermission = 'requesting_permission',
  /** 正在截取屏幕 */
  Capturing = 'capturing',
  /** 正在提取字幕 */
  Extracting = 'extracting',
  /** 字幕已就绪，等待用户确认 */
  SubtitleReady = 'subtitle_ready',
  /** 正在创建记忆卡片 */
  CreatingCard = 'creating_card',
  /** 创建完成 */
  Completed = 'completed',
  /** 错误 */
  Error = 'error',
  /** 触发限流 */
  RateLimited = 'rate_limited',
}

/**
 * 截屏流程状态 - 包含当前阶段及相关数据
 */
export type CaptureState =
  | { stage: CaptureStage.Idle }
  | { stage: CaptureStage.RequestingPermission }
  | { stage: CaptureStage.Capturing }
  | { stage: CaptureStage.Extracting; imageUrl: string }
  | { stage: CaptureStage.SubtitleReady; text: string; imageUrl: string }
  | { stage: CaptureStage.CreatingCard; text: string; imageUrl: string }
  | { stage: CaptureStage.Completed; cardData: MemoCardWithChannel; imageUrl: string }
  | { stage: CaptureStage.Error; message: string; imageUrl?: string }
  | { stage: CaptureStage.RateLimited; imageUrl?: string }

/**
 * 删除状态
 */
export interface DeleteState {
  /** 是否正在删除频道 */
  isDeletingChannel: boolean;
}

/**
 * 创建视频查看器初始状态
 */
export function createInitialVideoViewerState(
  initialVideoId: string,
  initialVideoTitle: string | null,
  videosList: VideoInfo[]
): VideoViewerState {
  // 如果没有传入标题，从视频列表中查找
  const videoTitle = initialVideoTitle 
    || videosList.find(v => v.videoId === initialVideoId)?.videoTitle 
    || null;

  return {
    currentVideoId: initialVideoId,
    currentVideoTitle: videoTitle,
    videos: videosList,
    filteredVideos: videosList,
    videoDuration: 0,
    isVideoPaused: true,
    hasEverPlayed: false,
    videoListOpen: false,
    isSelecting: false,
    selectorPosition: { top: 0, left: 0, width: 320 },
  };
}

/**
 * 创建记忆卡片展示初始状态
 */
export function createInitialMemoCardDisplayState(): MemoCardDisplayState {
  return {
    showMemoCard: false,
    selectedMemoCardId: '',
  };
}

/**
 * 创建截屏初始状态
 */
export function createInitialCaptureState(): CaptureState {
  return { stage: CaptureStage.Idle };
}

/**
 * 创建删除初始状态
 */
export function createInitialDeleteState(): DeleteState {
  return {
    isDeletingChannel: false,
  };
}

// ============================================
// 问 AI 相关类型
// ============================================

/**
 * 问 AI 阶段枚举
 */
export enum AskAIStage {
  /** 无对话记录，显示输入框 */
  Idle = 'idle',
  /** 有对话记录，显示预览框 */
  HasHistory = 'has_history',
  /** 弹窗打开 */
  DialogOpen = 'dialog_open',
}

/**
 * 问 AI 消息类型
 */
export interface AskAIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isInitialAnalysis?: boolean;
  isHistory?: boolean;
}

/**
 * 弹窗打开时待执行的动作
 */
export type AskAIPendingAction = 'grammar' | 'question';

/**
 * 问 AI 状态（每张卡片独立）
 */
export interface AskAIState {
  /** 当前阶段 */
  stage: AskAIStage;
  /** 消息列表 */
  messages: AskAIMessage[];
  /** AI 正在响应 */
  isLoading: boolean;
  /** 正在加载历史消息 */
  isLoadingHistory: boolean;
  /** 弹窗打开后待执行的动作 */
  pendingAction?: AskAIPendingAction;
  /** 待发送的问题 */
  pendingQuestion?: string;
}

/**
 * 创建问 AI 初始状态
 */
export function createInitialAskAIState(): AskAIState {
  return {
    stage: AskAIStage.Idle,
    messages: [],
    isLoading: false,
    isLoadingHistory: false,
  };
}
