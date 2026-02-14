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
    <div className="min-h-[52px]">
      <div className="flex flex-wrap items-start">
        {availableSegments.map((segment) => {
          const isSelected = selectedSegmentIds.includes(segment.id);

          return (
            <div key={`container-${segment.id}`} className="relative shrink-0">
              {/* 占位符 - 在元素被选中时显示 */}
              {isSelected && (
                <div className="bg-gray-100 opacity-50 shadow-neumorphic-weak m-1 px-3 py-2 border border-gray-300 rounded-lg font-medium text-black text-lg">
                  {segment.text}
                </div>
              )}

              {/* 实际可点击的元素 */}
              {!isSelected && (
                <div
                  onClick={() => onTokenClick(segment.id)}
                  className="relative bg-white hover:bg-blue-50 shadow-neumorphic-weak hover:shadow-neumorphic-button-hover m-1 px-3 py-2 border border-gray-200 hover:border-blue-300 rounded-lg font-medium text-black text-lg transition-all duration-200 cursor-pointer"
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
