'use client';

import { FC } from 'react';
import { Trash, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CtaButton } from '@/components/ui/cta-button';

export interface DeleteChannelPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDeleting: boolean;
  onConfirm: () => void;
  deleteWarningText: string;
  confirmDeleteText: string;
  deletingText: string;
}

export const DeleteChannelPopover: FC<DeleteChannelPopoverProps> = ({
  open,
  onOpenChange,
  isDeleting,
  onConfirm,
  deleteWarningText,
  confirmDeleteText,
  deletingText,
}) => (
  <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild>
      <div
        className="-top-2 -right-2 z-20 absolute bg-white hover:bg-red-50 shadow-md p-2 rounded-full cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Trash className="w-4 h-4 text-red-500" />
      </div>
    </PopoverTrigger>
    <PopoverContent 
      side="right" 
      align="center" 
      sideOffset={12}
      className="relative flex flex-col justify-end p-6"
      style={{ width: 268, height: 168 }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="top-[52px] left-6 right-6 absolute flex justify-center items-center gap-1.5 text-black text-[15px] whitespace-nowrap">
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
        {deleteWarningText}
      </p>
      <CtaButton
        text={isDeleting ? deletingText : confirmDeleteText}
        baseColor="#dc2626"
        onClick={onConfirm}
        disabled={isDeleting}
        width={220}
        height={32}
        textSize="text-sm"
      />
    </PopoverContent>
  </Popover>
);
