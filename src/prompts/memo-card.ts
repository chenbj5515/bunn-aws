/**
 * 记忆卡片相关 Prompt
 * 
 * 包含：
 * - 翻译 Prompt
 * - Ruby 注音 Prompt
 */

/**
 * 获取多语言翻译 Prompt
 */
export function getTranslationPrompt(text: string): string {
  return `请将以下日文句子翻译成英文、简体中文和繁体中文，返回JSON格式：
{"en": "英文翻译", "zh": "简体中文翻译", "zh-TW": "繁體中文翻譯"}

句子: ${text}

请确保翻译准确自然。只返回 JSON，不要任何其他内容。`;
}

/**
 * 获取 Ruby 注音 Prompt
 */
export function getRubyPrompt(text: string): string {
  return `请将这个日语文本「${text}」转换为Ruby注音格式，使用JSON表示，注意三点：
1. 所有汉字都要转化，注意你这里经常漏掉汉字的转化，避免这一点。
2. 如果一个词是外来词，那么ruby中不是假名的注音而应该是英文原文。
3. 如果一个词是英文，那么不要对这个词进行任何处理，注意这里你经常把英文也加上了ruby，避免这一点。

示例如下，
输入是「Ubie では「Ubie Vitals」というデザインシステムに則って UI 開発を行っています。」
输出目标下面这样的JSON结构：
{
	"tag": "span",
	"children": [
		"Ubie では「Ubie Vitals」という",
		{ "tag": "ruby", "text": "デザイン", "rt": "design" },
		{ "tag": "ruby", "text": "システム", "rt": "system" },
		"に",
		{ "tag": "ruby", "text": "則って", "rt": "のっとって" },
		" UI ",
		{ "tag": "ruby", "text": "開発", "rt": "かいはつ" },
		"を行っています。"
	]
}
注意，只需要返回JSON结构，不要返回任何其他内容。`;
}

/**
 * 翻译结果类型
 */
export interface TranslationResult {
  en?: string;
  zh?: string;
  'zh-TW'?: string;
  [key: string]: string | undefined;
}

/**
 * 处理翻译结果
 */
export function processTranslationContent(
  rawContent: string,
  fallbackLocale: string
): TranslationResult {
  const content = rawContent.trim();

  try {
    // 处理可能被 markdown 代码块包裹的情况
    const jsonStr = content.replace(/^```json?\s*|\s*```$/g, '').trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    // 如果无法解析为 JSON，使用原始内容作为 fallback locale 的翻译
    return { [fallbackLocale]: content };
  } catch {
    return { [fallbackLocale]: content };
  }
}

/**
 * 处理 Ruby 注音结果
 */
export function processRubyContent(rawContent: string): string {
  const content = rawContent.trim();
  // 移除可能的 markdown 代码块标记
  if (content.startsWith('```')) {
    return content.replace(/^```(?:json|html)?\s*|\s*```$/g, '').trim();
  }
  return content;
}

// ============================================
// Ruby Translations (单词翻译)
// ============================================

interface RubyItem {
  text: string;
  reading: string;
}

/**
 * 从 Ruby JSON 中提取需要翻译的词汇
 */
export function extractRubyItems(rubyJson: string): RubyItem[] {
  try {
    const data = JSON.parse(rubyJson);
    if (!data.children || !Array.isArray(data.children)) return [];

    return data.children
      .filter((child: any) => child?.tag === 'ruby' && child.text && child.rt)
      .map((child: any) => ({ text: child.text, reading: child.rt }));
  } catch {
    return [];
  }
}

/**
 * 获取 Ruby 词汇翻译 Prompt
 */
export function getRubyTranslationsPrompt(originalText: string, rubyItems: RubyItem[]): string {
  return `在下面句子的上下文中，请翻译以下单词到英文、简体中文和繁体中文，注意翻译结果要是在上下文中的意思：

句子: ${originalText}

单词列表:
${rubyItems.map(item => `- ${item.text}（读音：${item.reading}）`).join('\n')}

请以JSON格式返回每个单词的翻译，格式如下：
{
  "单词1": {"en": "english", "zh": "简体中文", "zh-TW": "繁體中文"},
  "单词2": {"en": "english", "zh": "简体中文", "zh-TW": "繁體中文"}
}

只返回 JSON，不要任何其他内容。`;
}

/**
 * 处理 Ruby 翻译结果
 */
export function processRubyTranslationsContent(
  rawContent: string
): Record<string, Record<string, string>> {
  try {
    const content = rawContent.trim();
    const jsonStr = content.replace(/^```json?\s*|\s*```$/g, '').trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    return {};
  }
}
