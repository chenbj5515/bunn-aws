/**
 * 设置用户 TTS 偏好
 */

import { after } from "next/server";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../../../init";
import { redis } from "@/lib/redis";
import { db, user as userTable } from "@/lib/db";

export const setPreference = protectedProcedure
  .input(
    z.object({
      preferred: z.enum(["haruka", "custom"]),
      voiceId: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "未授权",
      });
    }

    const { preferred, voiceId } = input;

    if (preferred === "custom" && !voiceId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "使用自定义声音时需要提供 voiceId",
      });
    }

    try {
      await redis.set(`user:${userId}:tts:preferred`, preferred);
      if (preferred === "custom" && voiceId) {
        await redis.set(`user:${userId}:tts:voice_id`, voiceId);
      }

      after(async () => {
        try {
          if (preferred === "custom" && voiceId) {
            await db
              .update(userTable)
              .set({
                preferredTTSVoice: preferred,
                ttsVoiceId: voiceId,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(userTable.id, userId));
          } else if (preferred === "haruka") {
            await db
              .update(userTable)
              .set({
                preferredTTSVoice: preferred,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(userTable.id, userId));
          }
        } catch (e) {
          console.error("[TTS Preference][POST] DB update error:", e);
        }
      });

      return { success: true };
    } catch (error) {
      console.error("[TTS Preference][POST] Error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "设置偏好失败",
      });
    }
  });
