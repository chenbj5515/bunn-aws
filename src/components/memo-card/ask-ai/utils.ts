import type { AskAIMessage } from "@/app/[locale]/channels/[channelId]/_store/types";

/**
 * 生成唯一消息 ID
 */
let messageIdCounter = 0;
export function generateUniqueId(prefix: string = "msg"): string {
  messageIdCounter += 1;
  return `${prefix}_${Date.now()}_${messageIdCounter}`;
}

/**
 * 重置消息 ID 计数器
 */
export function resetMessageIdCounter(): void {
  messageIdCounter = 0;
}

/**
 * 创建用户消息
 */
export function createUserMessage(content: string): AskAIMessage {
  return {
    id: generateUniqueId("user"),
    role: "user",
    content,
    isHistory: false,
  };
}

/**
 * 创建 AI 占位消息
 */
export function createAIPlaceholder(
  id?: string,
  isInitialAnalysis = false
): AskAIMessage {
  return {
    id: id || generateUniqueId("ai"),
    role: "assistant",
    content: "",
    isInitialAnalysis,
    isHistory: false,
  };
}

/**
 * 获取上下文文本
 */
export function getContextText(
  contextInfo: Array<{ zh: string; en: string; "zh-TW": string }> | undefined,
  locale: string
): string {
  try {
    if (Array.isArray(contextInfo) && contextInfo.length > 0) {
      const item = contextInfo[0];
      if (item) {
        return (
          item[locale as "zh" | "en" | "zh-TW"] ||
          item.zh ||
          item.en ||
          item["zh-TW"] ||
          ""
        );
      }
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * 获取目标语言文本
 */
export function getTargetLocale(locale: string): string {
  switch (locale) {
    case "zh":
      return "中文简体";
    case "zh-TW":
      return "繁体中文";
    default:
      return "英文";
  }
}
