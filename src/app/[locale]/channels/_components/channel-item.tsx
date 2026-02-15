'use client';

import { FC, useState, useRef } from 'react';
import Image from 'next/image';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { updateChannelName } from '../_server-functions/update-channel-name';
import { deleteChannel } from '../_server-functions/delete-channel';
import type { Channel, ChannelPosition } from './channels-client';
import { DeleteChannelPopover } from './delete-channel-popover';

// ============================================
// 类型定义
// ============================================

interface ChannelItemProps {
  channel: Channel;
  position: ChannelPosition;
  onPositionChange: (channelId: string, position: ChannelPosition) => void;
  onDelete: (channelId: string) => void;
  onClick: (channelId: string, firstVideoId: string | null) => void;
  onError: (message: string | null) => void;
}

// ============================================
// 主组件
// ============================================

export const ChannelItem: FC<ChannelItemProps> = ({
  channel,
  position,
  onPositionChange,
  onDelete,
  onClick,
  onError,
}) => {
  const t = useTranslations('Channels');
  const [isHovered, setIsHovered] = useState(false);
  const [editingName, setEditingName] = useState(channel.channelName);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isDraggingRef = useRef(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  // 拖拽开始
  const handleDragStart = () => {
    isDraggingRef.current = false;
  };

  // 拖拽中
  const handleDrag = () => {
    isDraggingRef.current = true;
  };

  // 拖拽结束
  const handleDragStop = (_e: DraggableEvent, data: DraggableData) => {
    onPositionChange(channel.channelId, { x: data.x, y: data.y });
    // 延迟重置，避免触发点击
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 10);
  };

  // 点击频道
  const handleClick = () => {
    if (!isDraggingRef.current) {
      onClick(channel.channelId, channel.firstVideoId);
    }
  };

  // 保存名称
  const handleSaveName = async () => {
    await updateChannelName(channel.channelId, editingName);
  };

  // 确认删除频道
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    onDelete(channel.channelId);

    try {
      const result = await deleteChannel(channel.channelId);
      if (!result.success) {
        onError(result.message || '删除频道失败');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : '删除频道失败');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      position={position}
      onStart={handleDragStart}
      onDrag={handleDrag}
      onStop={handleDragStop}
    >
      <div
        ref={nodeRef}
        className="absolute cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 头像 */}
        <motion.div
          className="relative rounded-full w-[80px] h-[80px]"
          whileHover={showDeleteConfirm ? undefined : { scale: 1.1 }}
          whileTap={showDeleteConfirm ? undefined : { scale: 0.95 }}
        >
          <Avatar avatarUrl={channel.avatarUrl} channelName={channel.channelName} />
          {(isHovered || showDeleteConfirm) && (
            <DeleteChannelPopover
              open={showDeleteConfirm}
              onOpenChange={setShowDeleteConfirm}
              isDeleting={isDeleting}
              onConfirm={handleConfirmDelete}
              deleteWarningText={t('deleteWarning')}
              confirmDeleteText={t('confirmDelete')}
              deletingText={t('deleting')}
            />
          )}
        </motion.div>

        {/* 名称输入框 */}
        <div className="-bottom-6 left-1/2 absolute w-[120px] -translate-x-1/2">
          <input
            className="-bottom-[10px] left-1/2 absolute bg-white focus:outline-none w-full overflow-hidden text-[14px] text-center text-ellipsis whitespace-nowrap -translate-x-1/2"
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={handleSaveName}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </Draggable>
  );
};

// ============================================
// 子组件
// ============================================

const Avatar: FC<{ avatarUrl?: string | null; channelName: string }> = ({ avatarUrl, channelName }) => {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={channelName}
        fill
        className="shadow-poster rounded-full object-cover"
        draggable="false"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  return (
    <div className="flex justify-center items-center bg-gray-300 rounded-full w-full h-full">
      <span className="font-medium text-gray-600 text-sm">{channelName.charAt(0).toUpperCase()}</span>
    </div>
  );
};

