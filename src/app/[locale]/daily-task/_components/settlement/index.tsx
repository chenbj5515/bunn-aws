'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import SettlementClient from '@/components/badges/settlement-client';
import { getCurrentBadgeLevel } from '@/constants/badge-levels';
import { SETTLEMENT_EXPERIENCE_MOTION } from '@/animation';
import { SETTLEMENT_VIDEO_URL } from '@/constants/utils';
import type { RoundResult } from '../../_store/types';
import { calculateGainedPoints } from './utils';
import { ActionPanel } from './action-panel';
import { PointsBadge } from './points-badge';

// ============================================
// 核心流程函数
// ============================================

/**
 * 1. 初始化结算 - 播放视频（尝试有声，失败则静音）
 */
function initializeSettlement(
  videoRef: React.RefObject<HTMLVideoElement | null>
): void {
  const video = videoRef.current;
  if (!video) return;

  // 尝试有声播放，失败则静音播放
  video.currentTime = 0;
  video.muted = false;
  video.play().catch(() => {
    video.muted = true;
    video.play().catch(() => {});
  });
}

/**
 * 2. 下一轮 - 重新加载页面
 */
function handleNextRound(): void {
  window.location.reload();
}

// ============================================
// 组件
// ============================================

interface SettlementProps {
  /** 答题结果列表 */
  results: RoundResult[];
  /** 用户初始积分（任务开始前） */
  initialPoints: number;
}

export function Settlement({ results, initialPoints }: SettlementProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // 计算获得的积分
  const gainedPoints = calculateGainedPoints(results);
  const finalPoints = initialPoints + gainedPoints;

  // 获取按钮颜色
  const cardColor = getCurrentBadgeLevel(finalPoints).color;

  // 动画配置
  const {
    overlay: overlayMotion,
    panel: panelMotion,
    video: videoMotion,
    content: contentMotion,
  } = SETTLEMENT_EXPERIENCE_MOTION;

  // 1. 初始化结算
  useEffect(() => {
    initializeSettlement(videoRef);
  }, []);

  // 2. 下一轮
  const onNextRound = handleNextRound;

  return (
    <motion.div
      {...overlayMotion}
      className="top-0 left-0 fixed flex justify-center items-center bg-white px-4 py-8 w-full h-full min-h-screen"
    >
      <motion.div {...panelMotion} className="z-10 relative mx-auto w-full max-w-[1200px]">
        <div className="flex justify-center items-stretch">
          {/* 左侧：视频元素 */}
          <div className="relative shrink-0 w-[600px]">
            <motion.video
              {...videoMotion}
              ref={videoRef}
              className="rounded-2xl w-full h-full object-cover"
              src={SETTLEMENT_VIDEO_URL}
              autoPlay
              loop
              playsInline
              preload="auto"
            />
            
            {/* Points展示 - 动漫风格带呼吸动画 */}
            <PointsBadge points={gainedPoints} />
          </div>

          {/* 右侧：卡片+下一轮按钮 */}
          <motion.div {...contentMotion} className="flex flex-col justify-center w-[520px]">
            <SettlementClient
              initialPoints={initialPoints}
              finalPoints={finalPoints}
              showButton={false}
            />

            <ActionPanel buttonColor={cardColor} onNextRound={onNextRound} />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Settlement;
