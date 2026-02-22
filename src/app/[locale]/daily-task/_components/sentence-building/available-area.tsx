'use client';

import type { WordSegment } from '@/types/extended-memo-card';

interface AvailableAreaProps {
  /** 所有可用片段 */
  availableSegments: WordSegment[];
  /** 已选中的片段 ID 列表 */
  selectedSegmentIds: string[];
  /** 点击备选片段的回调 */
  onTokenClick: (segmentId: string) => void;
}

export function AvailableArea({
  availableSegments,
  selectedSegmentIds,
  onTokenClick,
}: AvailableAreaProps) {
  return (
    <div>
      <div className="flex flex-wrap items-start">
        {availableSegments.map((segment) => {
          const isSelected = selectedSegmentIds.includes(segment.id);

          return (
            <div key={`container-${segment.id}`} className="relative shrink-0">
              {/* 占位符 - 在元素被选中时显示 */}
              {isSelected && (
                <div className="bg-[#EBF1F9] m-1 px-3 py-2 border border-[#BDC9D9] border-dashed rounded-xl font-medium text-[18px] text-transparent pointer-events-none">
                  {segment.text}
                </div>
              )}

              {/* 实际可点击的元素 */}
              {!isSelected && (
                <div
                  onClick={() => onTokenClick(segment.id)}
                  className="relative bg-white shadow-[0_2px_4px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(180,180,180,0.4)] m-1 px-3 py-2 border border-[#E1E8F0] hover:border-[#ccc] rounded-xl font-medium text-[#333C4E] text-[18px] transition-all hover:-translate-y-1 duration-200 ease-out cursor-pointer"
                >
                  {segment.text}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
