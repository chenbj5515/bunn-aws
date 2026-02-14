interface MessageBubbleProps {
  avatarUrl?: string;
  avatarAlt: string;
  text: string;
}

export function MessageBubble({ avatarUrl, avatarAlt, text }: MessageBubbleProps) {
  return (
    <div className="flex justify-start px-0">
      <div className="flex items-start gap-3 max-w-[80%]">
        {/* 角色头像 */}
        <img
          src={avatarUrl || '/icon/youtube.png'}
          alt={avatarAlt}
          className="border border-[#e5e7eb] rounded-full w-16 h-16 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/icon/youtube.png';
          }}
        />
        {/* 消息气泡 */}
        <div className="relative bg-white shadow-sm px-4 py-3 border border-[#e5e7eb] rounded-xl max-w-[75%]">
          {/* 三角形指向头像 */}
          <div className="top-4 -left-2 absolute bg-white border-[#e5e7eb] border-t border-l w-3 h-3 -rotate-45" />
          <p className="font-system-ui text-black text-base leading-relaxed">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
