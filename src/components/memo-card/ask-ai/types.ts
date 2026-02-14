/**
 * 记忆卡片数据（传入对话弹窗的数据）
 */
export interface MemoCardData {
  id: string;
  originalText: string | null;
  translation: Record<string, string> | string;
  contextInfo?: Array<{ zh: string; en: string; "zh-TW": string }>;
}

/**
 * AskAI 对话弹窗 Props
 */
export interface AskAIDialogProps {
  memoCard: MemoCardData;
}
