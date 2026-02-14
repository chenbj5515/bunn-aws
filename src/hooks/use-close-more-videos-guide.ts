"use client";

import { useEffect, useRef, useState } from 'react'

interface UseCloseMoreVideosGuideOptions {
  // 是否正在显示引导文案
  isGuideVisible?: boolean
  // 保留接口以保持兼容性，但不再使用
  imageRef?: React.RefObject<HTMLImageElement>
  radius?: number
}

interface UseCloseMoreVideosGuideResult {
  userClosedMoreVideos: boolean
  reset: () => void
  setGuideVisible: (visible: boolean) => void
}

/**
 * 监听鼠标进入iframe事件，只有当引导文案正在显示且鼠标完全进入iframe时，才关闭更多视频（本地状态）。
 */
export function useCloseMoreVideosGuide(options?: UseCloseMoreVideosGuideOptions): UseCloseMoreVideosGuideResult {
  const [userClosedMoreVideos, setUserClosedMoreVideos] = useState<boolean>(false)
  const [isGuideVisible, setIsGuideVisible] = useState<boolean>(false)

  
  useEffect(() => {
    // 只有当引导文案正在显示时才进行检测
    if (!isGuideVisible) return

    const handleMouseMove = (e: MouseEvent) => {
      if (userClosedMoreVideos) return

      // 查找页面中的iframe元素
      const iframe = document.querySelector('iframe')
      if (!iframe) return

      const rect = iframe.getBoundingClientRect()

      // 计算鼠标到iframe边界的距离
      const dx = Math.max(0, Math.max(rect.left - e.clientX, e.clientX - rect.right))
      const dy = Math.max(0, Math.max(rect.top - e.clientY, e.clientY - rect.bottom))
      const distance = Math.sqrt(dx * dx + dy * dy)

      // 如果距离为0（鼠标完全进入iframe），设置flag
      if (distance === 0) {
        setUserClosedMoreVideos(true)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [isGuideVisible, userClosedMoreVideos])

  return {
    userClosedMoreVideos,
    reset: () => setUserClosedMoreVideos(false),
    setGuideVisible: setIsGuideVisible
  }
}


