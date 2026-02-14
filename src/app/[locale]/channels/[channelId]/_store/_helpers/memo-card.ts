/**
 * 记忆卡片创建相关的工具函数
 */

/**
 * 预处理字幕文本
 * - 去除开头的括号内容（如说话人标注）
 * - 将空格转换为顿号
 */
export function preprocessText(text: string): string {
  return text
    .replace(/^[（(][^）)]*[）)]/, '')
    .replace(/\s+/g, '、')
    .trim();
}
