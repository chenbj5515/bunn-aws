/**
 * 克隆声音（仅管理员）
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { rateLimitedProcedure } from "../../../procedures";
import { db, user as userTable } from "@/lib/db";
import { ADMIN_USER_ID } from "../constants";
import { cloneVoiceOutput } from "../type";

export const cloneVoice = rateLimitedProcedure
  .input(
    z.object({
      audioBase64: z.string().min(1, "音频数据不能为空"),
      voiceId: z
        .string()
        .min(8, "voiceId 至少 8 个字符")
        .regex(
          /^[a-zA-Z][a-zA-Z0-9]{7,}$/,
          "voiceId 必须以字母开头，只能包含字母和数字"
        ),
    })
  )
  .output(cloneVoiceOutput)
  .mutation(async ({ input, ctx }) => {
    if (ctx.rateLimited) return { rateLimited: true };

    const userId = ctx.user?.id;
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "未授权",
      });
    }

    if (userId !== ADMIN_USER_ID) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "需要管理员权限",
      });
    }

    const { audioBase64, voiceId: customVoiceId } = input;

    const apiKey = process.env.MINIMAX_API_KEY || process.env.MIN_MAX_API_KEY;
    const baseUrl = process.env.MINIMAX_BASE_URL || "https://api.minimax.io";
    const groupId = process.env.MINIMAX_GROUP_ID || "";

    if (!apiKey) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Missing MINIMAX_API_KEY",
      });
    }

    try {
      const audioBuffer = Buffer.from(audioBase64, "base64");
      const audioBlob = new Blob([audioBuffer], { type: "audio/wav" });

      const uploadUrl = `${baseUrl}/v1/files/upload${groupId ? `?GroupId=${groupId}` : ""}`;
      const mmForm = new FormData();
      mmForm.append("purpose", "voice_clone");
      mmForm.append("file", audioBlob, "audio.wav");

      const mmUploadResp = await fetch(uploadUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: mmForm,
      });

      if (!mmUploadResp.ok) {
        const err = await mmUploadResp.text();
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: `上传失败: ${err}`,
        });
      }

      const uploadData = await mmUploadResp.json();
      const fileId =
        uploadData?.file?.file_id ||
        uploadData?.file_id ||
        uploadData?.data?.file_id;

      if (!fileId) {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "MiniMax 上传未返回 file_id",
        });
      }

      const cloneUrl = `${baseUrl}/v1/voice_clone${groupId ? `?GroupId=${groupId}` : ""}`;
      const cloneResp = await fetch(cloneUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_id: fileId, voice_id: customVoiceId }),
      });

      if (!cloneResp.ok) {
        const err = await cloneResp.text();
        console.error("克隆失败，响应内容:", err);
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: `克隆失败: ${err}`,
        });
      }

      const cloneData = await cloneResp.json();
      if (cloneData?.base_resp?.status_code !== 0) {
        console.error("克隆业务失败:", cloneData?.base_resp?.status_msg);
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: `克隆业务失败: ${cloneData?.base_resp?.status_msg || "未知错误"}`,
        });
      }

      try {
        await db
          .update(userTable)
          .set({
            ttsVoiceId: customVoiceId,
            preferredTTSVoice: "custom",
            updatedAt: new Date().toISOString(),
          })
          .where(eq(userTable.id, userId));
      } catch (dbError) {
        console.error("保存 voiceId 到数据库失败:", dbError);
      }

      return { rateLimited: false, voiceId: customVoiceId };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("[TTS Clone] Error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "克隆失败",
      });
    }
  });
