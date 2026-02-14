'use client'

import { useEffect, useState } from 'react'
import { updateUserRedis } from '@/server-functions/update-user-redis'

interface UseUpdateUserCacheProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  autoUpdate?: boolean // 是否在组件挂载时自动更新
}

interface UpdateUserCacheResult {
  isUpdating: boolean
  error: string | null
  updateCache: () => Promise<void>
}

/**
 * 更新用户 Redis 缓存（时区和订阅信息）的自定义 Hook
 * @param options 配置选项
 * @returns 操作状态和手动触发更新的函数
 */
export function useUpdateUserTimezone({
  onSuccess,
  onError,
  autoUpdate = true
}: UseUpdateUserCacheProps = {}): UpdateUserCacheResult {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取用户时区
  const getUserTimezone = (): string => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch (error) {
      console.error('获取时区失败:', error)
      return 'UTC'
    }
  }

  // 更新缓存的主函数
  const updateCache = async (): Promise<void> => {
    try {
      setIsUpdating(true)
      setError(null)

      const timezone = getUserTimezone()
      const result = await updateUserRedis(timezone)

      if (result.success) {
        onSuccess?.()
      } else {
        const errorMessage = result.error || '更新用户缓存失败'
        setError(errorMessage)
        onError?.(errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新缓存时发生未知错误'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  // 组件挂载时自动更新缓存
  useEffect(() => {
    if (autoUpdate) {
      updateCache()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    isUpdating,
    error,
    updateCache
  }
}
