/**
 * 视频播放器配置
 */
export const VIDEO_PLAYER_CONFIG = {
  /** 跳转时间间隔（秒） */
  SEEK_INTERVAL: 5,
  /** 播放器轮询间隔（毫秒） */
  POLL_INTERVAL: 300,
  /** 播放器宽度 */
  PLAYER_WIDTH: '780px',
  /** 播放器高度 */
  PLAYER_HEIGHT: '439px',
} as const;

/**
 * YouTube 播放器状态码
 */
export const YOUTUBE_PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  VIDEO_CUED: 5,
} as const;

/**
 * 按钮尺寸
 */
export const BUTTON_SIZE = {
  ROUND: 48,
} as const;

/**
 * 动画配置
 */
export const ANIMATION_CONFIG = {
  /** 视图切换动画时长 */
  VIEW_TRANSITION_DURATION: 0.35,
  /** 视图切换缓动函数 */
  VIEW_TRANSITION_EASE: [0.22, 1, 0.36, 1],
} as const;

/**
 * 中文区域列表
 */
export const CHINESE_LOCALES = ['zh', 'zh-TW'] as const;

/**
 * 判断是否为中文区域
 */
export function isChineseLocale(locale: string): boolean {
  return CHINESE_LOCALES.includes(locale as typeof CHINESE_LOCALES[number]);
}
