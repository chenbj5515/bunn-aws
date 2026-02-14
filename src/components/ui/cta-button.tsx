'use client';

import React from 'react';

interface CtaButtonProps {
  text: React.ReactNode;
  baseColor: string; // 作为主色，组件内部自动生成渐变
  onClick?: () => void;
  disabled?: boolean;
  width?: number;
  height?: number;
  textSize?: string;
  fontWeight?: string;
}

function shadeHexColor(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  // percent: 负数加深，正数变亮（向255靠拢）
  r = Math.min(255, Math.max(0, Math.round(r + (255 - r) * percent)));
  g = Math.min(255, Math.max(0, Math.round(g + (255 - g) * percent)));
  b = Math.min(255, Math.max(0, Math.round(b + (255 - b) * percent)));
  return `rgb(${r}, ${g}, ${b})`;
}

export function CtaButton({
  text,
  baseColor,
  onClick,
  disabled,
  width = 150,
  height = 46,
  textSize = 'text-lg',
  fontWeight = 'font-semibold'
}: CtaButtonProps) {
  const darker = shadeHexColor(baseColor, -0.3);
  const mid = shadeHexColor(baseColor, -0.15);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative bg-transparent hover:brightness-110 p-0 border-none outline-offset-4 cursor-pointer select-none"
      style={{ width, height }}
    >
      {/* 阴影层（和 Let's go 按钮一致）*/}
      <span className="top-0 left-0 absolute bg-black/25 rounded-xl w-full h-full transition-transform translate-y-0.5 group-active:translate-y-px group-hover:translate-y-1 duration-300 will-change-transform cubic-bezier(0.3,0.7,0.4,1)"></span>
      {/* 渐变层（根据 baseColor 生成）*/}
      <span
        className="top-0 left-0 absolute rounded-xl w-full h-full"
        style={{ background: `linear-gradient(to left, ${darker}, ${mid}, ${darker})` }}
      ></span>
      {/* 内容层（主色块，与 Let's go 一致的位移动效）*/}
      <span
        className={`relative flex justify-center items-center rounded-xl text-white transition-transform -translate-y-1 group-active:-translate-y-0.5 group-hover:-translate-y-1.5 duration-300 will-change-transform ${textSize} ${fontWeight}`}
        style={{ width, height, backgroundColor: baseColor }}
      >
        {text}
      </span>
    </button>
  );
}

interface CtaRoundButtonProps {
  children: React.ReactNode;
  baseColor: string;
  onClick?: () => void;
  disabled?: boolean;
  size?: number;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function CtaRoundButton({
  children,
  baseColor,
  onClick,
  disabled,
  size = 48,
  className = "",
  onMouseEnter,
  onMouseLeave
}: CtaRoundButtonProps) {
  const darker = shadeHexColor(baseColor, -0.3);
  const mid = shadeHexColor(baseColor, -0.15);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group relative bg-transparent hover:brightness-110 p-0 border-none outline-offset-4 cursor-pointer select-none ${className}`}
      style={{ width: size, height: size - 2 }}
    >
      {/* 阴影层 */}
      <span
        className="top-0 left-0 absolute bg-black/25 rounded-full group-active:rounded-[24px] w-full h-full group-active:scale-[1.1] transition-all translate-y-0.5 group-active:translate-y-px group-hover:translate-y-1 duration-300 will-change-transform cubic-bezier(0.3,0.7,0.4,1)"
      ></span>
      {/* 渐变层 */}
      <span
        className="top-0 left-0 absolute rounded-full group-active:rounded-[24px] w-full h-full group-active:scale-[1.1] transition-all duration-300"
        style={{ background: `linear-gradient(to left, ${darker}, ${mid}, ${darker})` }}
      ></span>
      {/* 内容层 */}
      <span
        className="relative flex justify-center items-center rounded-full group-active:rounded-[24px] text-white group-active:scale-[1.1] transition-all -translate-y-1 group-active:-translate-y-0.5 group-hover:-translate-y-1.5 duration-300 will-change-transform"
        style={{ width: size, height: size, backgroundColor: baseColor }}
      >
        {children}
      </span>
    </button>
  );
}

export type { CtaRoundButtonProps };
export default CtaButton;