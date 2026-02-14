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
    <div className="min-h-[54px]">
      <div className="flex flex-wrap items-start">
        {selectedSegmentIds.map((segmentId) => {
          const segment = availableSegments.find((s) => s.id === segmentId);
          if (!segment) return null;

          return (
            <div
              key={`selected-${segmentId}`}
              onClick={showResult ? undefined : () => onTokenClick(segmentId)}
              className={`
                shrink-0 bg-blue-50 shadow-neumorphic-weak px-3 py-2 border border-blue-300 rounded-lg
                font-medium text-blue-700 text-lg m-1
                ${showResult
                  ? 'cursor-default'
                  : 'hover:bg-blue-100 hover:shadow-neumorphic-button-hover cursor-pointer transition-all duration-200'
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
