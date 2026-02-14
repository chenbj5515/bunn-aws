'use client';

import { FC, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import { ChannelItem } from './channel-item';
import { ErrorToast } from './error-toast';
import { AddVideoDropdown } from '@/components/add-video-dropdown';

// ============================================
// 类型定义
// ============================================

export interface Channel {
  channelId: string;
  channelName: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  firstVideoId: string | null;
}

export interface ChannelPosition {
  x: number;
  y: number;
}

interface ChannelsClientProps {
  channels: Channel[];
  savedPositions: Record<string, ChannelPosition>;
}

// ============================================
// 工具函数
// ============================================

/** 计算默认位置（错位网格） */
function getDefaultPosition(index: number): ChannelPosition {
  const baseY = 80 + Math.floor(index / 9) * 120;
  const offsetY = index % 2 === 0 ? 0 : 60;
  return {
    x: 80 + (index % 9) * 180,
    y: baseY + offsetY,
  };
}

/** 保存位置到 Cookie */
function savePositions(positions: Record<string, ChannelPosition>): void {
  try {
    Cookies.set('channel_positions', JSON.stringify(positions), { expires: 365, path: '/' });
  } catch (error) {
    console.error('Failed to save positions:', error);
  }
}

// ============================================
// 主组件
// ============================================

export const ChannelsClient: FC<ChannelsClientProps> = ({ channels: initialChannels, savedPositions }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [channels, setChannels] = useState(initialChannels);
  const [positions, setPositions] = useState(savedPositions);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 客户端挂载时从 Cookie 读取最新位置（解决后退时缓存问题）
  useEffect(() => {
    const cookie = Cookies.get('channel_positions');
    if (cookie) {
      setPositions(JSON.parse(cookie));
    }
  }, []);

  // 更新单个频道位置
  const handlePositionChange = (channelId: string, position: ChannelPosition) => {
    setPositions((prev) => {
      const updated = { ...prev, [channelId]: position };
      savePositions(updated);
      return updated;
    });
  }

  // 删除频道
  const handleDeleteChannel = (channelId: string) => {
    setChannels((prev) => prev.filter((c) => c.channelId !== channelId));
  }

  // 点击频道
  const handleChannelClick = (channelId: string, firstVideoId: string | null) => {
    const locale = pathname.split('/')[1];
    const url = firstVideoId
      ? `/${locale}/channels/${encodeURIComponent(channelId)}?videoId=${encodeURIComponent(firstVideoId)}`
      : `/${locale}/channels/${encodeURIComponent(channelId)}`;
    router.push(url);
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <AddVideoDropdown safariMode={true} />
      {channels.map((channel, index) => (
        <ChannelItem
          key={channel.channelId}
          channel={channel}
          position={positions[channel.channelId] || getDefaultPosition(index)}
          onPositionChange={handlePositionChange}
          onDelete={handleDeleteChannel}
          onClick={handleChannelClick}
          onError={setErrorMessage}
        />
      ))}
      <ErrorToast message={errorMessage} onClose={() => setErrorMessage(null)} />
    </div>
  );
};

export default ChannelsClient;
