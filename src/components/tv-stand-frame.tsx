"use client";

import React from 'react';
import Image from 'next/image';

interface TvStandFrameProps {
  children: React.ReactNode;
  marginTop?: number;
}

/**
 * 极简电视支架样式容器。
 * - 固定容纳 780x439 的内容区域，整体外框 812x471（含 16px 边框留白）。
 * - 底部两侧支腿使用图片；
 * - 椭圆形投影用半透明背景 + blur 实现；
 * - 通过外层 pt 预留空间，避免布局跳动。
 */
export function TvStandFrame({ children, marginTop = 0 }: TvStandFrameProps) {
  return (
    <div className={`relative mx-auto pb-[20px]`} style={{ marginTop: `${marginTop}px` }}> {/* 增加上下间距，避免重合 */}
      {/* 外框 */}
      <div className="relative bg-black shadow-[inset_0_8px_24px_#00000014] mx-auto border border-black rounded-[24px] w-[812px] h-[471px]">
        {/* 屏幕槽位 */}
        <div className="top-[16px] right-[16px] bottom-[16px] left-[16px] absolute flex justify-center items-center bg-[#0A0A0A] rounded-[16px] overflow-hidden">
          {children}
        </div>
      </div>

      {/* 支腿 */}
      <div className="bottom-[-60px] left-[15%] absolute">
        <Image 
          src="/images/tv-stand-left.png" 
          alt="TV Stand Left" 
          width={120} 
          height={120}
          priority
        />
      </div>
      <div className="right-[15%] bottom-[-60px] absolute">
        <Image 
          src="/images/tv-stand-right.png" 
          alt="TV Stand Right" 
          width={120} 
          height={120}
          priority
        />
      </div>
    </div>
  );
}

export default TvStandFrame;


