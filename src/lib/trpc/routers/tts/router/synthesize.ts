/**
 * 文本转语音
 * 返回 base64 编码的音频数据
 */

import { after } from "next/server";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { rateLimitedProcedure } from "../../../procedures";
import { trackUsage } from "@/lib/auth/billing";
import { getTTSFromCache, saveTTSToCache } from "../helpers/cache";
import { resolveVoiceId } from "../helpers/voice";
import { callMinimaxTTS } from "../helpers/minimax";
import { synthesizeOutput } from "../type";

export const synthesize = rateLimitedProcedure
  .input(
    z.object({
      text: z.string().min(1, "文本不能为空"),
      language: z.string().default("ja"),
      skipCache: z.boolean().default(false),
    })
  )
  .output(synthesizeOutput)
  .mutation(async ({ input, ctx }) => {
    if (ctx.rateLimited) return { rateLimited: true };

    const { text, language, skipCache } = input;
    const trimmedText = text.trim();
    const userId = ctx.user?.id;

    if (!trimmedText) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "文本不能为空",
      });
    }

    const voiceId = await resolveVoiceId({ userId });

    if (!skipCache) {
      const cachedAudio = await getTTSFromCache(trimmedText, voiceId);
      if (cachedAudio) {
        after(() =>
          trackUsage({
            inputTokens: 0,
            outputTokens: 0,
            model: "minimax-tts",
            costMeta: { provider: "blob" },
          })
        );
        return {
          rateLimited: false,
          audioBase64: cachedAudio,
          cacheHit: true,
        };
      }
    }

    const audioBase64 = await callMinimaxTTS({
      text: trimmedText,
      voiceId,
      language,
    });

    after(async () => {
      await saveTTSToCache(trimmedText, audioBase64, voiceId);
      await trackUsage({
        inputTokens: 0,
        outputTokens: 0,
        model: "minimax-tts",
        costMeta: {
          provider: "minimax",
          chars: trimmedText.length,
        },
      });
    });

    return {
      rateLimited: false,
      audioBase64,
      cacheHit: false,
    };
  });
