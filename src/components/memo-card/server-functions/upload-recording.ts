"use server";

import { uploadToBlob } from '@/server/upload';
import { db } from '@/lib/db/index';
import { memoCard } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export interface UploadRecordingResult {
  success: boolean;
  url?: string;
  message?: string;
}

/**
 * 上传录音文件并更新数据库
 * @param cardId 记忆卡片ID
 * @param audioBlob 音频文件blob
 * @returns 上传结果
 */
export async function uploadRecording(cardId: string, audioBlob: File): Promise<UploadRecordingResult> {
  try {
    // 1. 验证用户身份
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        message: '请先登录'
      };
    }

    // 2. 验证文件类型
    if (!audioBlob.type.startsWith('audio/')) {
      return {
        success: false,
        message: '只支持上传音频文件'
      };
    }

    // 3. 检查文件大小（限制为10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (audioBlob.size > maxSize) {
      return {
        success: false,
        message: '音频文件大小不能超过10MB'
      };
    }

    // 4. 验证卡片所有权
    const card = await db
      .select()
      .from(memoCard)
      .where(eq(memoCard.id, cardId))
      .limit(1);

    if (card.length === 0) {
      return {
        success: false,
        message: '记忆卡片不存在'
      };
    }

    const cardData = card[0];
    if (!cardData || cardData.userId !== session.user.id) {
      return {
        success: false,
        message: '无权上传此卡片的录音'
      };
    }

    // 5. 上传文件到Vercel Blob
    const uploadResult = await uploadToBlob(audioBlob, {
      directory: 'recordings',
      path: `${session.user.id}/${cardId}`,
      trackUpload: false, // 不记录统计
      access: 'public'
    });

    if (!uploadResult.success) {
      return {
        success: false,
        message: uploadResult.message || '录音上传失败'
      };
    }

    // 6. 更新数据库中的recordFilePath
    await db
      .update(memoCard)
      .set({
        recordFilePath: uploadResult.url,
        updateTime: new Date().toISOString()
      })
      .where(eq(memoCard.id, cardId));

    // 7. 返回成功结果
    return {
      success: true,
      url: uploadResult.url
    };

  } catch (error) {
    console.error('录音上传失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '录音上传失败'
    };
  }
}
