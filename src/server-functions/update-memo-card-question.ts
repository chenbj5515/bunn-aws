"use server";

import { db } from "@/lib/db";
import { memoCard } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { getServerTrpc } from "@/lib/trpc/server";
import type { QuestionType } from "@/types/memo-card";
import type { AppLocale, RequiredLocalizedText } from "@/types/locale";

interface UpdateMemoCardQuestionParams {
  memoCardId: string;
  questionText: string; // 通常为中文
  sourceLang?: AppLocale;
  questionType?: QuestionType | null; // 未选择时可不传
}

interface UpdateMemoCardQuestionResult {
  success: boolean;
  memoCardId?: string;
  question?: RequiredLocalizedText;
  error?: string;
}

export async function updateMemoCardQuestion(params: UpdateMemoCardQuestionParams): Promise<UpdateMemoCardQuestionResult> {
  const { memoCardId, questionText, sourceLang = 'zh', questionType } = params;
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: '未登录' };
    }

    // 校验卡片归属
    const cardRows = await db
      .select({ id: memoCard.id, userId: memoCard.userId })
      .from(memoCard)
      .where(and(eq(memoCard.id, memoCardId), eq(memoCard.userId, session.user.id)))
      .limit(1);

    if (cardRows.length === 0) {
      return { success: false, error: '卡片不存在或无权限' };
    }

    const trpc = await getServerTrpc();
    const result = await trpc.ai.translateQuestion({
      questionText,
      sourceLang,
    });
    if (result.errorCode !== null) {
      return { success: false, error: '更新失败，请重试' };
    }
    const questionJson = result.question;

    // 更新数据库（仅当有提供questionType时一并更新；未提供则不改动类型）
    const setFields: any = { question: questionJson };
    if (typeof questionType !== 'undefined') {
      setFields.questionType = questionType ?? null;
    }

    await db
      .update(memoCard)
      .set(setFields)
      .where(and(eq(memoCard.id, memoCardId), eq(memoCard.userId, session.user.id)));

    return { success: true, memoCardId, question: questionJson };
  } catch (error) {
    // 失败时也要尽量记录信息
    console.error('更新卡片问题失败:', error);
    return { success: false, error: '更新失败，请重试' };
  }
}


