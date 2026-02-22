'use client';

import type { WordSegment } from '@/types/extended-memo-card';

interface SelectedAreaProps {
  /** 已选中的片段 ID 列表 */
  selectedSegmentIds: string[];
  /** 所有可用片段 */
  availableSegments: WordSegment[];
  /** 是否已显示结果 */
  showResult: boolean;
  /** 点击选中片段的回调 */
  onTokenClick: (segmentId: string) => void;
}

export function SelectedArea({
  selectedSegmentIds,
  availableSegments,
  showResult,
  onTokenClick,
}: SelectedAreaProps) {
  return (
    <div className="pb-2.5">
      <div className="flex flex-wrap items-start">
        {selectedSegmentIds.map((segmentId) => {
          const segment = availableSegments.find((s) => s.id === segmentId);
          if (!segment) return null;

          return (
            <div
              key={`selected-${segmentId}`}
              onClick={showResult ? undefined : () => onTokenClick(segmentId)}
              className={`
                shrink-0 bg-white px-3 py-2 border border-[#E1E8F0] rounded-xl m-1
                text-[18px] font-medium text-[#333C4E]
                transition-all duration-200 ease-out
                ${showResult
                  ? 'cursor-default shadow-[0_2px_4px_rgba(0,0,0,0.05)]'
                  : 'cursor-pointer shadow-[0_2px_4px_rgba(0,0,0,0.05)] hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(180,180,180,0.4)] hover:border-[#ccc]'
                }
              `}
            >
              {segment.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
