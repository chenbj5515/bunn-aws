import { useState, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { getTranslationByLocale } from '@/lib/translation-utils';
import { saveMemoCardMessage } from '../components/memo-card/server-functions/memo-card-messages';
import { getCardMessages, HistoryMessage as ApiHistoryMessage } from '../components/memo-card/server-functions/get-card-messages';
import { useRefState } from './utils';

// 消息类型定义
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  rawContent?: string;
  isInitialAnalysis?: boolean;
  isHistory?: boolean;
}

// 记忆卡片类型
interface MemoCard {
  id: string;
  originalText: string | null;
  translation: Record<string, string> | string;
  messages?: HistoryMessage[];
  contextInfo?: any[];
}

// 历史消息类型
interface HistoryMessage {
  id: string;
  role: string;
  content: string;
  isInitialAnalysis: boolean;
  createTime: string;
  messageOrder: number;
}

// 钩子函数选项
interface UseGrammarAnalysisChatOptions {
  memoCard: MemoCard;
  setDisplayCards: React.Dispatch<React.SetStateAction<any>>;
  onError?: (error: Error) => void;
}

export function useGrammarAnalysisChat({ memoCard, setDisplayCards, onError }: UseGrammarAnalysisChatOptions) {
  const t = useTranslations('grammarAnalysis');
  const [messagesRef, setMessages] = useRefState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageIdCounterRef = useRef(0);

  // 生成唯一消息ID
  const generateUniqueId = (prefix: string = 'msg') => {
    messageIdCounterRef.current += 1;
    return `${prefix}_${Date.now()}_${messageIdCounterRef.current}`;
  };

  // 获取目标语言
  const locale = useLocale();
  const targetLocale = locale === 'zh' ? '中文简体' : locale === 'zh-TW' ? '繁体中文' : '英文';

  // 读取记忆卡片上下文，按当前locale优先，回退到 zh -> en -> zh-TW
  const getContextText = (): string => {
    try {
      const info = (memoCard as any).contextInfo as any[] | undefined;
      if (Array.isArray(info) && info.length > 0) {
        const item = info[0];
        if (item) {
          // @ts-ignore
          return item[locale as string] || item.zh || item.en || item['zh-TW'] || '';
        }
      }
      return '';
    } catch {
      return '';
    }
  };

  // 保存消息到数据库
  const saveMessageToDatabase = async (
    messageRole: 'user' | 'assistant',
    messageContent: string,
    isInitial: boolean
  ) => {
    try {
      const result = await saveMemoCardMessage(
        memoCard.id,
        messageRole,
        messageContent,
        isInitial
      );

      if (!result.success) {
        console.error('保存消息失败:', result.error);
      }
    } catch (error) {
      console.error('保存消息出错:', error);
    }
  };

  // 加载卡片消息历史
  const loadCardMessages = async () => {
    try {
      setIsLoadingMessages(true);

      // 使用server function获取消息
      const result = await getCardMessages(memoCard.id);

      if (result.success && result.messages.length > 0) {
        // 将API消息类型转换为组件内部使用的类型
        const convertedMessages: HistoryMessage[] = result.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          isInitialAnalysis: msg.isInitialAnalysis === null ? false : msg.isInitialAnalysis,
          createTime: msg.createTime,
          messageOrder: msg.messageOrder === null ? 0 : msg.messageOrder
        }));

        // 使用setDisplayCards更新当前卡片的messages属性，而不是直接修改memoCard
        setDisplayCards((prevCards: any[]) =>
          prevCards.map(card =>
            card.id === memoCard.id
              ? { ...card, messages: convertedMessages }
              : card
          )
        );

        return convertedMessages;
      }

      return [];
    } catch (error) {
      console.error('加载消息历史失败:', error);
      if (onError) onError(error as Error);
      return [];
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // 初始化聊天 - 加载历史消息或准备新聊天
  const initializeChat = async () => {
    // 检查是否有预加载的消息
    if (memoCard.messages && memoCard.messages.length > 0) {
      // 转换格式并设置消息列表
      const formattedMessages: Message[] = memoCard.messages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        isInitialAnalysis: msg.isInitialAnalysis,
        isHistory: true
      }));

      setMessages(formattedMessages);
      return true;  // 返回有历史消息
    } else {
      // 没有预加载的消息，尝试从服务器加载
      const messages = await loadCardMessages();

      if (messages.length > 0) {
        // 转换格式并设置消息列表
        const formattedMessages: Message[] = messages.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          isInitialAnalysis: !!msg.isInitialAnalysis,
          isHistory: true
        }));

        setMessages(formattedMessages);
        return true;  // 返回有历史消息
      }

      // 没有找到历史消息
      return false;
    }
  };

  // 取消当前请求
  const cancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // 组件卸载时的清理函数
  const cleanup = () => {
    cancelRequest();
  };

  // 发送消息到AI
  const sendToAI = async (userInput: string, isInitialPrompt = false) => {
    try {
      setIsLoading(true);

      // 如果有用户输入，添加到消息列表
      if (userInput.trim()) {
        // 添加用户消息到消息列表
        const newUserMessage: Message = {
          id: generateUniqueId('user'),
          role: 'user',
          content: userInput,
          isHistory: false
        };

        setMessages([...messagesRef.current, newUserMessage]);

        // 保存用户消息到数据库
        await saveMessageToDatabase('user', userInput, false);
      }

      // 中止之前的请求
      cancelRequest();

      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();

      // 准备系统提示信息，根据是否是初始提示提供不同的指导
      let systemPrompt = '';

      if (isInitialPrompt) {
        // 初始语法分析的提示词
        const contextText = getContextText();
        systemPrompt = `
          用户是一名语言学习者，你需要给用户解释下下面的句子
          - 句子原文：${memoCard.originalText || '无'}
          - 参考译文：${getTranslationByLocale(memoCard.translation, locale) || '无'}
          ${contextText ? `- 上下文：${contextText}` : ''}

          你需要按照下面的格式输出：
          ${contextText ? '1. 总结上下文（用1-2句话简要说明这段上下文的主要内容和背景）' : ''}
          ${contextText ? '2. ' : '1. '}列出原文
          ${contextText ? '3. ' : '2. '}解释句子的意思
          ${contextText ? '4. ' : '3. '}挑选出关键的单词，短语和语法点解释，重要：
             - 解释单词或短语的时候一定要结合原文中，在这个句子中是什么意思，为什么会是这个意思等
             - 对于日语单词和短语，必须提供假名音标（平假名或片假名）
             - 格式示例：单词/短语（假名音标）- 解释
             - 例如：おはよう（おはよう）- 早上好
          语法方面尽量不要用术语，用通俗易懂的方式解释。

          回答要简洁专业，使用通俗易懂的方式解释，适合学习者理解。
          请使用${targetLocale}回答。

          请使用Markdown格式来结构化你的回答，使用#、##、###等标题，使用**粗体**强调重要内容，在列举单词，短语和语法点的时候用md的列举的语法。
        `;
      } else {
        // 后续对话的提示词
        systemPrompt = `
          你是一个日语学习助手，刚才你已经对以下文本进行了语法分析：
          - 原文：${memoCard.originalText || '无'}
                    
          现在用户可能会问你相关的问题，你只需要回答用户的问题，不要重复你之前的分析内容。
          
          回答要简洁专业，使用通俗易懂的方式解释，适合日语学习者理解。
          请使用${targetLocale}回答。
          
          使用Markdown格式来结构化你的回答，使用**粗体**强调重要内容，使用\`代码\`标记单词和短语。
        `;
      }

      // 构建对话历史
      let dialogueHistory = '';
      if (messagesRef.current.length > 0) {
        dialogueHistory = '\n\n对话历史：\n';
        messagesRef.current.forEach(msg => {
          if (msg.role === 'user') {
            dialogueHistory += `用户: ${msg.content}\n`;
          } else if (msg.role === 'assistant') {
            dialogueHistory += `助手: ${msg.content}\n`;
          }
        });

        // 如果有用户输入，添加到对话历史
        if (userInput.trim()) {
          dialogueHistory += `用户: ${userInput}\n`;
        }
      }

      // 添加额外指令
      const additionalInstruction = isInitialPrompt
        ? '\n\n请立即开始分析这段文本，不要询问用户任何问题，直接给出专业的分析。'
        : '\n\n请直接回答用户的最新问题，不要再进行语法分析，除非用户明确要求。把注意力集中在用户刚才提出的问题上。';

      // 完整提示词
      const fullPrompt = `${systemPrompt}${dialogueHistory}${additionalInstruction}`;

      // 创建新的 AI 消息ID
      const aiMessageId = generateUniqueId('ai');

      // 添加空消息到列表，准备流式更新
      setMessages([...messagesRef.current, {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        isInitialAnalysis: isInitialPrompt,
        isHistory: false
      }]);

      try {
        const response = await fetch('/api/ai/generate-text-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: fullPrompt,
            model: 'gpt-4o-mini',
          }),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let aiMessage = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // 处理 SSE 格式
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6); // 移除 'data: ' 前缀

              if (data === '[DONE]') {
                setDisplayCards((prevCards: any[]) =>
                  prevCards.map(card =>
                    card.id === memoCard.id
                      ? {
                        ...card,
                        messages: messagesRef.current
                      }
                      : card
                  )
                );
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                // 支持两种可能的响应格式
                if (parsed.delta) {
                  // 累积AI回复内容
                  aiMessage += parsed.delta;

                  // 更新消息
                  setMessages(
                    messagesRef.current.map(msg =>
                      msg.id === aiMessageId
                        ? {
                          ...msg,
                          content: aiMessage,
                          isInitialAnalysis: isInitialPrompt
                        }
                        : msg
                    )
                  );
                }
              } catch (e) {
                console.error('解析错误:', e);
              }
            }
          }
        }

        // 在流式响应完成后，保存AI消息到数据库
        await saveMessageToDatabase('assistant', aiMessage, isInitialPrompt);

      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('API请求错误:', error);

          // 移除占位的AI消息，避免展示错误文案
          setMessages(
            messagesRef.current.filter(msg => msg.id !== aiMessageId)
          );

          // 调用错误回调（例如展示限流弹窗）
          if (onError) {
            onError(error as Error);
          }
        }
      }
    } catch (error) {
      console.error('处理错误:', error);

      // 不再插入错误消息文本，改为交由回调统一处理（如弹出限流）
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages: messagesRef.current,
    isLoading,
    isLoadingMessages,
    sendToAI,
    initializeChat,
    cleanup,
  };
} 