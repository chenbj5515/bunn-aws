"use server";

import { db } from "@/lib/db";
import { memoCard } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * 更新 memo card 关联的角色
 * @param memoCardId memo card 的 ID
 * @param characterId 角色 ID
 * @returns 返回操作结果
 */
export async function updateMemoCardCharacter(
  memoCardId: string,
  characterId: string
) {
  try {
    await db
      .update(memoCard)
      .set({ characterId })
      .where(eq(memoCard.id, memoCardId));

    return { success: true };
  } catch (error) {
    console.error("更新角色关联失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "更新角色关联失败",
    };
  }
}
