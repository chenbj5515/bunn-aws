/**
 * TTS Router - 文本转语音
 */

import { router } from "../../init";
import { synthesize } from "./router/synthesize";
import { getPreference } from "./router/get-preference";
import { setPreference } from "./router/set-preference";
import { cloneVoice } from "./router/clone-voice";

export const ttsRouter = router({
  synthesize,
  getPreference,
  setPreference,
  cloneVoice,
});

export type TTSRouter = typeof ttsRouter;
