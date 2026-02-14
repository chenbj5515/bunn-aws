/**
 * 获取用户 TTS 偏好设置
 */

import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../../../init";
import { redis } from "@/lib/redis";
import { db, user as userTable } from "@/lib/db";
import { type PreferredType } from "../constants";

export const getPreference = protectedProcedure.query(async ({ ctx }) => {
  const userId = ctx.user?.id;
  if (!userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "未授权",
    });
  }

  try {
    const [preferred, voiceId] = await Promise.all([
      redis.get<string>(`user:${userId}:tts:preferred`),
      redis.get<string>(`user:${userId}:tts:voice_id`),
    ]);

    if (preferred === "custom" && voiceId) {
      return { preferred: "custom" as PreferredType, voiceId };
    }

    const rows = await db
      .select({
        ttsVoiceId: userTable.ttsVoiceId,
        preferred: userTable.preferredTTSVoice,
      })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    const row = rows?.[0];
    if (row?.preferred === "custom" && row?.ttsVoiceId) {
      return { preferred: "custom" as PreferredType, voiceId: row.ttsVoiceId };
    }

    return { preferred: "haruka" as PreferredType };
  } catch (error) {
    console.error("[TTS Preference][GET] Error:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "获取偏好设置失败",
    });
  }
});
