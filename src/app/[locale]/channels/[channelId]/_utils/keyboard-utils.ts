import { YOUTUBE_PLAYER_STATE, VIDEO_PLAYER_CONFIG } from './constants';

/**
 * 视频播放器控制接口
 */
export interface VideoPlayerControl {
  getPlayerState: () => number;
  getCurrentTime: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (time: number, allowSeekAhead: boolean) => void;
}

/**
 * 键盘锁定状态
 */
export interface KeyboardLockState {
  videoListOpen: boolean;
  isSelecting: boolean;
  showMemoCard: boolean;
  isCapturingSubtitle: boolean;
}

/**
 * 弹窗/列表打开时禁用视频快捷键
 */
function isKeyboardLocked(state: KeyboardLockState): boolean {
  return state.videoListOpen || state.isSelecting || state.showMemoCard || state.isCapturingSubtitle;
}

/**
 * 检查是否有交互元素获得焦点
 * 当用户焦点在输入框、按钮等元素上时，说明用户正在进行文字输入或 UI 交互，
 * 此时禁用视频快捷键，避免按空格/方向键时干扰正常操作
 */
export function isInteractiveElementFocused(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  // 输入框、文本域、按钮
  const interactiveTags = ['INPUT', 'TEXTAREA', 'BUTTON'];
  if (interactiveTags.includes(activeElement.tagName)) return true;

  // 可编辑元素（如富文本编辑器）
  if ((activeElement as HTMLElement).contentEditable === 'true') return true;

  // ARIA 角色标记的交互元素
  const role = activeElement.getAttribute('role');
  if (role && ['button', 'link', 'menuitem'].includes(role)) return true;

  return false;
}

/**
 * 处理空格键 - 播放/暂停
 */
export function handleSpaceKey(player: VideoPlayerControl | null): void {
  if (!player) return;

  const playerState = player.getPlayerState();
  
  if (playerState === YOUTUBE_PLAYER_STATE.PLAYING) {
    player.pauseVideo();
  } else if (
    playerState === YOUTUBE_PLAYER_STATE.PAUSED ||
    playerState === YOUTUBE_PLAYER_STATE.ENDED ||
    playerState === YOUTUBE_PLAYER_STATE.VIDEO_CUED
  ) {
    player.playVideo();
  }
}

/**
 * 处理左箭头键 - 后退
 */
export function handleArrowLeftKey(player: VideoPlayerControl | null): void {
  if (!player) return;

  const currentTime = player.getCurrentTime();
  const newTime = Math.max(0, currentTime - VIDEO_PLAYER_CONFIG.SEEK_INTERVAL);
  player.seekTo(newTime, true);
}

/**
 * 处理右箭头键 - 前进
 */
export function handleArrowRightKey(player: VideoPlayerControl | null): void {
  if (!player) return;

  const currentTime = player.getCurrentTime();
  player.seekTo(currentTime + VIDEO_PLAYER_CONFIG.SEEK_INTERVAL, true);
}

/**
 * 键盘事件配置
 */
export interface KeyboardConfig {
  getPlayer: () => VideoPlayerControl | null;
  getLockState: () => KeyboardLockState;
  onCapture: () => void;
}

/**
 * 创建键盘事件处理器
 * 使用 getter 函数确保每次事件触发时获取最新的播放器和锁定状态
 */
export function createKeyboardHandler(config: KeyboardConfig): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    // 弹窗/列表打开时，用户不是在专注看视频，禁用快捷键避免误操作
    if (isKeyboardLocked(config.getLockState())) return;

    // 用户正在输入框打字或操作按钮，禁用快捷键避免干扰
    if (isInteractiveElementFocused()) return;

    const player = config.getPlayer();

    // Ctrl 键：触发截屏
    if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      config.onCapture();
      return;
    }

    // 空格键：播放/暂停
    if (event.code === 'Space') {
      event.preventDefault();
      handleSpaceKey(player);
      return;
    }

    // 左箭头：后退
    if (event.code === 'ArrowLeft') {
      event.preventDefault();
      handleArrowLeftKey(player);
      return;
    }

    // 右箭头：前进
    if (event.code === 'ArrowRight') {
      event.preventDefault();
      handleArrowRightKey(player);
      return;
    }
  };
}
