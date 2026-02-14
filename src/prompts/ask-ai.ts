/**
 * 问 AI 相关 Prompt
 *
 * 包含：
 * - 语法分析初始 Prompt
 * - 追问对话 Prompt
 */

interface GrammarAnalysisParams {
  originalText: string;
  translation: string;
  contextText?: string;
  targetLocale: string;
}

interface FollowUpParams {
  originalText: string;
  targetLocale: string;
}

/**
 * 获取语法分析 Prompt（初始分析）
 */
export function getGrammarAnalysisPrompt(params: GrammarAnalysisParams): string {
  const { originalText, translation, contextText, targetLocale } = params;
  const hasContext = !!contextText;

  return `用户是一名语言学习者，你需要给用户解释下下面的句子
- 句子原文：${originalText || '无'}
- 参考译文：${translation || '无'}
${hasContext ? `- 上下文：${contextText}` : ''}

你需要按照下面的格式输出：
${hasContext ? '1. 总结上下文（用1-2句话简要说明这段上下文的主要内容和背景）' : ''}
${hasContext ? '2. ' : '1. '}列出原文
${hasContext ? '3. ' : '2. '}解释句子的意思
${hasContext ? '4. ' : '3. '}挑选出关键的单词，短语和语法点解释，重要：
   - 解释单词或短语的时候一定要结合原文中，在这个句子中是什么意思，为什么会是这个意思等
   - 对于日语单词和短语，必须提供假名音标（平假名或片假名）
   - 格式示例：单词/短语（假名音标）- 解释
   - 例如：おはよう（おはよう）- 早上好
语法方面尽量不要用术语，用通俗易懂的方式解释。

回答要简洁专业，使用通俗易懂的方式解释，适合学习者理解。
请使用${targetLocale}回答。

请使用Markdown格式来结构化你的回答，使用#、##、###等标题，使用**粗体**强调重要内容，在列举单词，短语和语法点的时候用md的列举的语法。`;
}

/**
 * 获取追问对话 Prompt
 */
export function getFollowUpPrompt(params: FollowUpParams): string {
  const { originalText, targetLocale } = params;

  return `你是一个日语学习助手，刚才你已经对以下文本进行了语法分析：
- 原文：${originalText || '无'}
          
现在用户可能会问你相关的问题，你只需要回答用户的问题，不要重复你之前的分析内容。

回答要简洁专业，使用通俗易懂的方式解释，适合日语学习者理解。
请使用${targetLocale}回答。

使用Markdown格式来结构化你的回答，使用**粗体**强调重要内容，使用\`代码\`标记单词和短语。`;
}

/**
 * 构建对话历史文本
 */
export function buildDialogueHistory(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  currentUserInput?: string
): string {
  if (messages.length === 0 && !currentUserInput?.trim()) {
    return '';
  }

  let history = '\n\n对话历史：\n';
  messages.forEach((msg) => {
    if (msg.role === 'user') {
      history += `用户: ${msg.content}\n`;
    } else if (msg.role === 'assistant') {
      history += `助手: ${msg.content}\n`;
    }
  });

  if (currentUserInput?.trim()) {
    history += `用户: ${currentUserInput}\n`;
  }

  return history;
}

/**
 * 获取附加指令
 */
export function getAdditionalInstruction(isInitialPrompt: boolean): string {
  return isInitialPrompt
    ? '\n\n请立即开始分析这段文本，不要询问用户任何问题，直接给出专业的分析。'
    : '\n\n请直接回答用户的最新问题，不要再进行语法分析，除非用户明确要求。把注意力集中在用户刚才提出的问题上。';
}
