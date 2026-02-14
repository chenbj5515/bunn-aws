'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { speakTextWithMinimax } from '@/lib/tts/client';
import { useTranslations } from 'next-intl';
import { uploadFile } from '@/lib/upload';
import { updateMemoCardAvatarUrl } from '@/components/memo-card/server-functions/update-avatar-url';
import InlineLimitBanner from '@/components/ui/inline-limit-banner';
import { OriginalText } from '@/components/memo-card/original-text';

interface AvatarSpeechBubbleProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  originalText?: string | null;
  showBlur?: boolean;
  /** 记忆卡片ID，用于关联新创建的角色 */
  memoCardId?: string;
  /** 上传成功后的回调（可选） */
  onAvatarUpdated?: (url: string) => void;
  /** ruby 原文结构化数据（可选） */
  rubyOriginalTextRecord?: any;
  /** ruby 翻译记录（可选） */
  rubyTranslationRecord?: any;
}

export function AvatarSpeechBubble({
  avatarUrl,
  displayName,
  originalText,
  showBlur = false,
  memoCardId,
  onAvatarUpdated,
  rubyOriginalTextRecord,
  rubyTranslationRecord,
}: AvatarSpeechBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const t = useTranslations('memoCards');
  const [localAvatar, setLocalAvatar] = useState<string>(avatarUrl || '/icon/youtube.png');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [hintKey, setHintKey] = useState<'pasteHint' | 'noImage'>('pasteHint');
  const [uploading, setUploading] = useState<boolean>(false);
  const avatarImgRef = useRef<HTMLImageElement | null>(null);
  const [showLimit, setShowLimit] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [hintPos, setHintPos] = useState<{ top: number; left: number; placeBelow: boolean }>({ top: 0, left: 0, placeBelow: false });

  const updateHintPosition = () => {
    if (!avatarImgRef.current) return;
    const rect = avatarImgRef.current.getBoundingClientRect();
    let top = rect.top - 28;
    let placeBelow = false;
    if (top < 0) {
      top = rect.bottom + 8;
      placeBelow = true;
    }
    const left = rect.left;
    setHintPos({ top, left, placeBelow });
  };

  const handlePlayTTS = async () => {
    if (isPlaying || !originalText) return;
    setIsPlaying(true);
    try {
      await speakTextWithMinimax(originalText);
    } catch (error) {
      console.error('TTS播放失败:', error);
      const status = (error as any)?.status;
      if (status === 403) {
        setShowLimit(true);
      }
    } finally {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    setLocalAvatar(avatarUrl || '/icon/youtube.png');
  }, [avatarUrl]);

  // 检查管理员权限
  useEffect(() => {
    async function checkAdmin() {
      try {
        const response = await fetch('/api/user/check-admin', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin);
        }
      } catch (error) {
        console.error('检查管理员权限失败:', error);
        setIsAdmin(false);
      }
    }

    checkAdmin();
  }, []);


  // 点击头像显示提示
  const handleAvatarClick = () => {
    setHintKey('pasteHint');
    setShowHint(true);
    updateHintPosition();
  };

  // 监听粘贴与外部点击
  useEffect(() => {
    if (!showHint) return;

    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (avatarImgRef.current && target && !avatarImgRef.current.contains(target)) {
        setShowHint(false);
      }
    };

    const handleScroll = () => updateHintPosition();
    const handleResize = () => updateHintPosition();

    const handlePaste = async (e: ClipboardEvent) => {
      try {
        if (uploading) return;
        if (!e.clipboardData) return;

        // 优先从 files 获取图片
        let imageFile: File | null = null;
        if (e.clipboardData.files && e.clipboardData.files.length > 0) {
          for (let i = 0; i < e.clipboardData.files.length; i++) {
            const fileCandidate = e.clipboardData.files.item(i);
            if (fileCandidate && fileCandidate.type && fileCandidate.type.startsWith('image/')) {
              imageFile = fileCandidate;
              break;
            }
          }
        }

        // 兼容从 items 提取图片
        if (!imageFile) {
          const items = e.clipboardData.items;
          for (let i = 0; i < items.length; i++) {
            const itemCandidate = items[i];
            if (itemCandidate && itemCandidate.type && itemCandidate.type.startsWith('image/')) {
              const blob = itemCandidate.getAsFile();
              if (blob) {
                imageFile = new File([blob], 'avatar.png', { type: blob.type || 'image/png' });
                break;
              }
            }
          }
        }

        if (!imageFile) {
          setHintKey('noImage');
          return;
        }

        setUploading(true);
        // 1) 前端直传到 /api/upload（保留鉴权由接口校验）
        let newUrl: string | null = null;
        if (memoCardId) {
          const uploadRes = await uploadFile(imageFile, {
            directory: 'character-avatars/memo-cards',
            path: memoCardId,
          });
          if (!uploadRes.success || !uploadRes.url) {
            const msg = uploadRes.message || '上传失败';
            if (msg.includes('限制') || msg.includes('Limit') || msg.includes('403')) {
              setShowLimit(true);
            }
            return;
          }
          newUrl = uploadRes.url;

          // 2) 调 server function 仅更新DB
          const updateRes = await updateMemoCardAvatarUrl(memoCardId, newUrl);
          if (!updateRes.success) {
            // 若DB更新失败，提示但本地先展示
            console.error('更新记忆卡片头像失败:', updateRes.message);
          }
        }

        if (newUrl) {
          setLocalAvatar(newUrl);
          if (onAvatarUpdated) onAvatarUpdated(newUrl);
          setShowHint(false);
        }
      } finally {
        setUploading(false);
      }
    };

    document.addEventListener('click', handleDocClick, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    const pasteListener: EventListener = (evt: Event) => handlePaste(evt as unknown as ClipboardEvent);
    window.addEventListener('paste', pasteListener);
    return () => {
      document.removeEventListener('click', handleDocClick, true);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('paste', pasteListener);
    };
  }, [showHint, uploading, memoCardId, onAvatarUpdated]);

  const finalAvatar = localAvatar;

  return (
    <>
    <div className="flex flex-col justify-start px-0">
      {showLimit && <InlineLimitBanner />}
      <div className="flex items-start gap-3 max-w-[80%]">
        <div className="relative shrink-0">
          <img
            src={finalAvatar}
            alt={displayName || 'avatar'}
            className="border border-[#e5e7eb] rounded-full w-16 h-16 object-cover cursor-pointer"
            ref={avatarImgRef}
            onClick={handleAvatarClick}
          />
          {uploading && (
            <div className="top-0 left-0 absolute flex justify-center items-center bg-black bg-opacity-50 rounded-full w-16 h-16">
              <div className="border-2 border-white border-t-transparent rounded-full w-6 h-6 animate-spin"></div>
            </div>
          )}
        </div>
        <div className="relative bg-white shadow-sm px-4 py-3 border border-[#e5e7eb] rounded-xl max-w-[75%]">
          {showBlur && (
            <div className="top-0 left-0 z-1000 absolute backdrop-blur-[3px] backdrop-saturate-180 rounded-xl w-full h-full" />
          )}
          <div className="top-4 -left-2 absolute bg-white border-[#e5e7eb] border-t border-l w-3 h-3 -rotate-45" />
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayTTS}
              disabled={isPlaying || !originalText}
              className="flex justify-center items-center hover:bg-gray-50 rounded-full w-8 h-8 transition-colors"
            >
              <svg
                className={`w-5 h-5 text-[#0034df] ${isPlaying ? 'animate-pulse' : ''}`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            </button>
            <div className="text-black text-base leading-loose">
              {rubyOriginalTextRecord ? (
                <OriginalText
                  rubyOriginalTextRecord={rubyOriginalTextRecord}
                  rubyTranslationRecord={rubyTranslationRecord}
                  id={memoCardId}
                  noOffset
                  tooltipTheme="default"
                />
              ) : (
                <span>{originalText || ''}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    <AvatarSpeechBubbleHintPortal
      show={showHint && !showLimit}
      text={hintKey === 'pasteHint' ? t('avatar.pasteHint') : t('avatar.noImage')}
      top={hintPos.top}
      left={hintPos.left}
    />
    </>
  );
}

// 外部提示 Portal 渲染（放在组件返回之外以避免干扰内部布局）
export function AvatarSpeechBubbleHintPortal({
  show,
  text,
  top,
  left,
}: {
  show: boolean;
  text: string;
  top: number;
  left: number;
}) {
  if (!show || typeof document === 'undefined') return null;
  return createPortal(
    <div className="z-10000 fixed" style={{ top, left }}>
      <div className="bg-white shadow px-2 py-1 border border-[#e5e7eb] rounded-md text-[#9333ea] text-[14px] tracking-[1px] whitespace-nowrap">
        {text}
      </div>
    </div>,
    document.body
  );
}


