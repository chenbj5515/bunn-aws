import { TRPCError } from "@trpc/server";
import { LANGUAGE_BOOST_MAP } from "../constants";

export interface MinimaxTTSOptions {
  text: string;
  voiceId: string;
  language: string;
}

/**
 * 调用 Minimax TTS API
 * 返回 base64 编码的音频数据
 */
export async function callMinimaxTTS({
  text,
  voiceId,
  language,
}: MinimaxTTSOptions): Promise<string> {
  const apiKey = process.env.MIN_MAX_API_KEY;
  if (!apiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Missing MIN_MAX_API_KEY",
    });
  }

  const languageBoost = LANGUAGE_BOOST_MAP[language] ?? "Japanese";

  const response = await fetch("https://api.minimax.io/v1/t2a_v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "speech-02-hd",
      text,
      language_boost: languageBoost,
      stream: false,
      voice_setting: {
        voice_id: voiceId,
        speed: 1,
        vol: 1,
        pitch: 0,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: "mp3",
        channel: 1,
      },
    }),
  });

  const payload = await response.json();

  if (response.status !== 200) {
    console.error("Minimax TTS API 请求失败:", {
      status: response.status,
      statusText: response.statusText,
      voiceId,
      text: text.length > 50 ? `${text.slice(0, 50)}...` : text,
      payload,
    });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Minimax API 请求失败: ${response.status} ${response.statusText}`,
    });
  }

  if (payload.base_resp?.status_code !== 0) {
    console.error("Minimax TTS 业务错误:", {
      statusCode: payload.base_resp?.status_code,
      statusMsg: payload.base_resp?.status_msg,
      voiceId,
      text: text.length > 50 ? `${text.slice(0, 50)}...` : text,
    });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Minimax error: ${payload.base_resp?.status_msg ?? "unknown"}`,
    });
  }

  const audioStr: string | undefined = payload.data?.audio;
  if (!audioStr) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Minimax 响应缺少音频数据",
    });
  }

  // Minimax 返回的是 hex 或 base64 格式
  const buffer = /^[0-9a-fA-F]+$/.test(audioStr)
    ? Buffer.from(audioStr, "hex")
    : Buffer.from(audioStr, "base64");

  return buffer.toString("base64");
}
