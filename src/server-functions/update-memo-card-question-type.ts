"use server";

import { db } from "@/lib/db";
import { memoCard } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import type { QuestionType } from "@/types/memo-card";

interface UpdateMemoCardQuestionTypeParams {
  memoCardId: string;
  questionType: QuestionType | null;
}

interface UpdateMemoCardQuestionTypeResult {
  success: boolean;
  error?: string;
}

export async function updateMemoCardQuestionType(
  params: UpdateMemoCardQuestionTypeParams
): Promise<UpdateMemoCardQuestionTypeResult> {
  const { memoCardId, questionType } = params;
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: '未登录' };
    }

    await db
      .update(memoCard)
      .set({ questionType })
      .where(and(eq(memoCard.id, memoCardId), eq(memoCard.userId, session.user.id)));

    return { success: true };
  } catch (error) {
    console.error('更新问题类型失败:', error);
    return { success: false, error: '更新失败，请重试' };
  }
}


