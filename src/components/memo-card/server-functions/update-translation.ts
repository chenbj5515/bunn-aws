"use server"

import { db } from "@/lib/db";
import { memoCard } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// 只负责数据库更新的server function
export async function updateMemoCardTranslationInDB(id: string, translationObject: Record<string, string>) {
    try {
        // 直接更新数据库
        await db
            .update(memoCard)
            .set({
                translation: translationObject,
                updateTime: new Date().toISOString()
            })
            .where(eq(memoCard.id, id));

        return { success: true, translation: translationObject };

    } catch (error) {
        console.error('更新翻译时出错:', error);
        throw error;
    }
}

// 保留原函数作为向后兼容，但现在它不再生成翻译，只调用上面的函数
export async function updateMemoCardTranslation(id: string, translationObject: Record<string, string>) {
    return updateMemoCardTranslationInDB(id, translationObject);
}
