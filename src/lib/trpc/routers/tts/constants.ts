// TTS 缓存相关常量
export const TTS_CACHE_PREFIX = "tts:cache:";
export const TTS_CACHE_EXPIRY = 30 * 24 * 60 * 60; // 30 days

// 默认声音 ID
export const DEFAULT_VOICE_ID =
  "moss_audio_f0c5494c-7c25-11f0-8d70-a2abf1fbea61";

// 语言映射
export const LANGUAGE_BOOST_MAP: Record<string, string> = {
  ja: "Japanese",
  en: "English",
  "zh-CN": "Chinese",
  "zh-TW": "Chinese",
};

// 管理员用户 ID（硬编码，与 bunn-web 保持一致）
export const ADMIN_USER_ID = "e390urIOYotFcXkyOXY0MxxrgJcfyiHq";

// 用户偏好类型
export type PreferredType = "haruka" | "custom";
