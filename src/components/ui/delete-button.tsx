'use client';

import { FC } from 'react';
import { Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CtaRoundButton } from '@/components/ui/cta-button';

interface DeleteButtonProps {
  /** 点击回调 */
  onClick: () => void;
  /** tooltip 提示文本 */
  label?: string;
  /** 是否加载中 */
  loading?: boolean;
  /** 按钮大小，默认 48 */
  size?: number;
  /** 图标大小，默认 w-6 h-6 */
  iconSize?: string;
  /** 额外的 className（用于定位等） */
  className?: string;
  /** tooltip 显示方向 */
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * 通用删除按钮组件
 * 使用 CtaRoundButton 样式，支持 loading 和 tooltip
 */
export const DeleteButton: FC<DeleteButtonProps> = ({
  onClick,
  label = '删除',
  loading = false,
  size = 48,
  iconSize = 'w-6 h-6',
  className = '',
  tooltipSide = 'right',
}) => {
  if (loading) {
    return (
      <div className={className}>
        <CtaRoundButton
          baseColor="#DC2626"
          size={size}
          aria-label={label}
          disabled
          className="hover:bg-[#DC2626]! hover:shadow-none! cursor-not-allowed pointer-events-none"
        >
          <span className="border-white border-b-2 rounded-full w-6 h-6 animate-spin" />
        </CtaRoundButton>
      </div>
    );
  }

  return (
    <div className={className}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <CtaRoundButton
              baseColor="#DC2626"
              onClick={onClick}
              size={size}
              aria-label={label}
              className="group"
            >
              <Trash2 className={`${iconSize} text-white`} />
            </CtaRoundButton>
          </div>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} sideOffset={10}>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
