'use client';

import { useTranslations } from 'next-intl';

interface ActionPanelProps {
  /** 按钮背景颜色（基于徽章等级） */
  buttonColor: string;
  /** 点击下一轮回调 */
  onNextRound: () => void;
}

/**
 * 结算页面的操作面板
 * 包含下一轮按钮
 */
export function ActionPanel({ buttonColor, onNextRound }: ActionPanelProps) {
  const tBadges = useTranslations('badges');

  return (
    <div className="relative mx-auto mt-[46px] w-full max-w-[425px] h-[46px]">
      <button
        onClick={onNextRound}
        className="group inline-block relative bg-transparent hover:brightness-110 p-0 border-none outline-offset-4 w-full h-full cursor-pointer select-none"
      >
        {/* 按钮阴影 */}
        <span className="top-0 left-0 absolute bg-black/25 rounded-xl w-full h-full transition-transform translate-y-0.5 group-active:translate-y-px group-hover:translate-y-1 duration-300 will-change-transform cubic-bezier(0.3,0.7,0.4,1)" />
        
        {/* 渐变遮罩 */}
        <span
          className="top-0 left-0 absolute rounded-xl w-full h-full"
          style={{
            background: 'linear-gradient(to left, rgba(0,0,0,0.15), rgba(0,0,0,0.08), rgba(0,0,0,0.15))',
          }}
        />
        
        {/* 按钮主体 */}
        <span
          className="relative flex justify-center items-center rounded-xl w-full h-full font-semibold text-black text-lg transition-transform -translate-y-1 group-active:-translate-y-0.5 group-hover:-translate-y-1.5 duration-300 will-change-transform"
          style={{ backgroundColor: buttonColor }}
        >
          {tBadges('nextRound')}
        </span>
      </button>
    </div>
  );
}
