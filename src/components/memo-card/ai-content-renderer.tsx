"use client";

import { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

interface AIContentRendererProps {
  content: string;
}

/**
 * 预处理 Markdown 字符串，修复 CJK 字符与强调标记的兼容性问题
 * CommonMark 规范中，**text** 后紧跟 CJK 字符时无法正确识别结束符
 * 解决方案：直接将 **text** 和 *text* 转换为 HTML 标签，绕过解析器限制
 */
function preprocessMarkdown(text: string): string {
  // 先处理加粗 **text**，转换为 <strong>text</strong>
  // 使用非贪婪匹配，确保最短匹配
  let result = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // 再处理斜体 *text*，转换为 <em>text</em>
  // 注意：需要排除已经转换的 HTML 标签内的内容
  result = result.replace(/\*([^*<>]+)\*/g, '<em>$1</em>');
  
  return result;
}

/**
 * 渲染AI内容的React组件
 * @param content AI返回的可能包含Markdown格式的文本内容
 */
export function AIContentRenderer({ content }: AIContentRendererProps): ReactNode {
  if (!content) return null;

  const processedContent = preprocessMarkdown(content);

  return (
    <div className="text-[15px] leading-[1.9] tracking-[0.5px] markdown-content">
      <ReactMarkdown rehypePlugins={[rehypeRaw]}>{processedContent}</ReactMarkdown>
    </div>
  );
}