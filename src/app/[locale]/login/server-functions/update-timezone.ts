'use server'

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

/**
 * 更新当前登录用户的时区
 * @param timezone 用户时区 (例如 'Asia/Shanghai')
 * @returns 更新是否成功
 */
export async function updateUserTimezone(timezone: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 获取当前会话
    const session = await getSession()
    
    // 检查用户是否已登录
    if (!session?.user?.id) {
      return { success: false, error: 'User not authenticated' }
    }
    
    // 更新用户时区
    await db.update(user)
      .set({ timezone })
      .where(eq(user.id, session.user.id))
    
    return { success: true }
  } catch (error) {
    console.error('Failed to update timezone:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
