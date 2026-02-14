'use client';

interface PointsBadgeProps {
  /** 获得的积分 */
  points: number;
}

/**
 * 积分徽章组件
 * 动漫风格带呼吸动画的积分展示
 */
export function PointsBadge({ points }: PointsBadgeProps) {
  return (
    <div className="-top-[40px] left-0 z-20 absolute w-full pointer-events-none">
      <div className="flex justify-center">
        <div className="relative w-full">
          <div className="top-[-60px] left-1/2 absolute">
            <div className="-translate-x-1/2">
              <div className="animate-breathe">
                <div className="relative">
                  {/* 外层光晕效果 */}
                  <div className="absolute inset-0 bg-linear-to-r from-[#FFD700] to-[#FFA500] opacity-60 blur-lg rounded-full" />

                  {/* 主体容器 */}
                  <div className="relative flex items-center gap-3 bg-linear-to-br from-[#FFD700] via-[#FFED4E] to-[#FFA500] shadow-xl px-7 py-2 border-[#FFFFFF] border-2 rounded-full">
                    {/* 装饰性闪光 */}
                    <div className="top-1.5 left-4 absolute bg-white opacity-80 blur-sm rounded-full w-2 h-2" />
                    <div className="top-2 right-5 absolute bg-white opacity-60 blur-sm rounded-full w-1.5 h-1.5" />

                    {/* 金币图标 */}
                    <div className="relative flex justify-center items-center bg-linear-to-br from-[#FFA500] to-[#FF8C00] shadow-md border-[#FFFFFF] border-2 rounded-full w-10 h-10">
                      <span className="drop-shadow-md font-black text-white text-2xl">P</span>
                    </div>

                    {/* Points数字 */}
                    <div className="flex items-center pr-1">
                      <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] font-black text-white text-3xl leading-none">
                        +{points}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
