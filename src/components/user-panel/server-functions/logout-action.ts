"use server"

import { revalidatePath } from "next/cache"

/**
 * 登出后清除页面缓存
 * 确保用户在退出登录后能看到最新的未登录状态
 */
export async function revalidateAfterLogout() {
    // 清除所有页面的缓存，确保登录状态更新
    revalidatePath("/", "layout")
}
