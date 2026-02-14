import { z } from "zod";

// --- synthesize ---
export const synthesizeOutput = z.discriminatedUnion("rateLimited", [
  z.object({ rateLimited: z.literal(true) }),
  z.object({
    rateLimited: z.literal(false),
    audioBase64: z.string(),
    cacheHit: z.boolean(),
  }),
]);

export type SynthesizeOutput = z.infer<typeof synthesizeOutput>;

// --- cloneVoice ---
export const cloneVoiceOutput = z.discriminatedUnion("rateLimited", [
  z.object({ rateLimited: z.literal(true) }),
  z.object({
    rateLimited: z.literal(false),
    voiceId: z.string(),
  }),
]);

export type CloneVoiceOutput = z.infer<typeof cloneVoiceOutput>;
