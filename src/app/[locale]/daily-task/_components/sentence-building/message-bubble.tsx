'use client';

interface MessageBubbleProps {
  /** 头像 URL */
  avatarUrl?: string;
  /** 头像替代文本 */
  avatarAlt: string;
  /** 翻译文本 */
  translation: string;
  /** TTS 是否正在播放 */
  isPlaying?: boolean;
  /** TTS 播放回调 */
  onPlayTTS?: () => void;
}

export function MessageBubble({
  avatarUrl,
  avatarAlt,
  translation,
  isPlaying = false,
  onPlayTTS,
}: MessageBubbleProps) {
  return (
    <div className="flex justify-start px-0">
      <div className="flex items-start gap-3">
        {/* 角色头像 */}
        <img
          src={avatarUrl || '/images/youtube.png'}
          alt={avatarAlt}
          className="shrink-0 border border-[#e5e7eb] rounded-full w-16 h-16 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/youtube.png';
          }}
        />
        {/* 消息气泡 */}
        <div className="relative bg-white shadow-sm px-3 py-3 border border-[#e5e7eb] rounded-xl">
          {/* 三角形指向头像 */}
          <div className="top-4 -left-2 absolute bg-white border-[#e5e7eb] border-t border-l w-3 h-3 -rotate-45" />
          <div className="flex items-center gap-2">
            {/* TTS 按钮 */}
            {onPlayTTS && (
              <button
                onClick={onPlayTTS}
                disabled={isPlaying}
                className="flex shrink-0 justify-center items-center hover:bg-gray-50 rounded-full w-9 h-9 transition-colors"
              >
                <svg
                  className={`w-6 h-6 text-[#0034df] ${isPlaying ? 'animate-pulse' : ''}`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              </button>
            )}
            <span className="font-system-ui text-base leading-relaxed">
              {translation}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
