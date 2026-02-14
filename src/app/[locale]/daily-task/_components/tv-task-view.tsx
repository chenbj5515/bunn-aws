'use client';

import { TaskProgressBar } from './task-progress-bar';
import TvStandFrame from '@/components/tv-stand-frame';

interface TvTaskViewProps {
  /** 总卡片数 */
  total: number;
  /** 当前完成数 */
  completed: number;
  /** 连对次数 */
  streak: number;
  /** 电视框内容（视频区域） */
  children?: React.ReactNode;
}

/**
 * 电视任务视图组件
 * 展示进度条、电视支架和电视框的UI外壳
 */
export function TvTaskView({
  total,
  completed,
  streak,
  children
}: TvTaskViewProps) {
  return (
    <div className="relative flex justify-center items-start bg-gray-50 w-full h-full">
      {/* 进度条区域（PC绝对定位） */}
      <div className="top-[60px] left-1/2 z-10 absolute w-[660px] -translate-x-1/2">
        <TaskProgressBar
          total={total}
          completed={completed}
          streak={streak}
        />
      </div>

      {/* 电视支架和电视框 */}
      <div className="flex justify-center">
        <TvStandFrame marginTop={140}>
          {/* 视频区域占位 */}
          <div 
            className="flex justify-center items-center w-[780px] h-[439px]"
            style={{
              willChange: 'transform',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
            }}
          >
            {children}
          </div>
        </TvStandFrame>
      </div>
    </div>
  );
}

export default TvTaskView;
