"use client"

import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { useLocale, useTranslations } from 'next-intl';
import type { InferSelectModel } from "drizzle-orm";
import { memoCard } from "@/lib/db/schema";
import { getTranslationByLocale } from "@/lib/translation-utils";
import { getTimeAgo } from "./utils";
import { RecordingControls } from "./recording-controls";
import { Dictation } from "@/components/dictation";
import { ContextButton } from "./context-button";
import { GrammarAnalysisDialog } from "./grammar-analysis-dialog";
import { AvatarSpeechBubble } from "@/components/avatar-speech-bubble";
import { translateContext } from "./translate-context";
import { updateMemoCardTranslation } from "./server-functions/update-translation";
import { updateMemoCardQuestion } from "@/server-functions/update-memo-card-question";
import { updateMemoCardQuestionType } from "@/server-functions/update-memo-card-question-type";
import type { QuestionType } from "@/types/memo-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AskAISection } from "./ask-ai";

export function MemoCardV2(props: Omit<InferSelectModel<typeof memoCard>, 'chapterId' | 'translation'> & {
  translation: Record<string, string> | string;
} & {
  weakBorder?: boolean;
  hideCreateTime?: boolean;
  // 单词卡片数量（不同页面会传入）
  wordCardCount?: number;
  character?: any;
  allCharacters?: any[];
  onCharacterListChange?: () => void;
  onDelete?: () => void;
  width?: string | number;
  height?: string | number;
  mode?: string;
  characterAvatarUrl?: string | null;
  channelAvatarUrl?: string | null;
  setDisplayCards?: React.Dispatch<React.SetStateAction<any>>;
  onPlayVideo?: () => void;
  // 仅当每日任务出现问答题（且正确率达到阈值）时，才显示问题录入区域
  shouldShowQuestionEntry?: boolean;
  // 翻译更新后的回调，用于同步本地状态
  onTranslationUpdate?: (translation: Record<string, string>) => void;
  // 笔记/上下文更新后的回调，用于同步本地状态
  onContextInfoUpdate?: (contextInfo: Array<{ zh: string; en: string; 'zh-TW': string }>) => void;
}) {
  const {
    id,
    originalText,
    translation,
    createTime,
    weakBorder = false,
    hideCreateTime = false,
    contextUrl,
    characterId,
    seriesId,
    channelId,
    characterName,
    wordSegmentation,
    rubyTranslations,
    kanaPronunciation,
    setDisplayCards,
    character,
    allCharacters,
    onCharacterListChange,
    onDelete,
    width,
    height,
    mode,
    characterAvatarUrl,
    channelAvatarUrl,
    shouldShowQuestionEntry
  } = props as any;

  const locale = useLocale() as 'zh' | 'en' | 'zh-TW';
  const t = useTranslations('memoCards');
  const tCard = useTranslations('memoCard');

  console.log('rubyTranslations', rubyTranslations);

  const translationTextRef = useRef<HTMLDivElement>(null);
  const prevTranslationTextRef = useRef<string>("");
  const [showGrammarDialog, setShowGrammarDialog] = useState(false);

  const [isDictationFocused, setIsDictationFocused] = useState(false);

  // 问题录入本地状态（按当前语言优先，回退 zh -> en -> zh-TW）
  const initialQuestion = (() => {
    try {
      const q = (props as any).question as { zh?: string; en?: string; 'zh-TW'?: string } | string | undefined;
      // 如果是字符串，直接返回
      if (typeof q === 'string') {
        return q;
      }
      // 如果是对象，按照语言优先级提取
      return (q?.[locale] || q?.zh || q?.en || q?.['zh-TW'] || '').toString();
    } catch {
      return '';
    }
  })();
  const [questionInput, setQuestionInput] = useState<string>(initialQuestion);
  const [questionType, setQuestionType] = useState<string>(
    ((props as any).questionType as any) || 'description'
  );

  // 同步question和questionType的状态
  useEffect(() => {
    const newQuestion = (() => {
      try {
        const q = (props as any).question as { zh?: string; en?: string; 'zh-TW'?: string } | string | undefined;
        if (typeof q === 'string') {
          return q;
        }
        return (q?.[locale] || q?.zh || q?.en || q?.['zh-TW'] || '').toString();
      } catch {
        return '';
      }
    })();

    const newQuestionType = ((props as any).questionType as any) || 'description';

    setQuestionInput(newQuestion);
    setQuestionType(newQuestionType);
  }, [props.question, props.questionType, locale]);

  function handleTranslationFocus() {
    prevTranslationTextRef.current = translationTextRef.current?.textContent || "";
  }

  async function handleTranslationBlur() {
    const newTranslation = translationTextRef.current?.textContent || "";
    if (newTranslation && newTranslation !== prevTranslationTextRef.current) {
      try {
        // 使用优化的翻译函数，保持日语单词和短语不变
        const translations = await translateContext(newTranslation, locale);

        // 构造完整的翻译对象，合并新翻译
        const finalTranslations = {
          ...translation,
          zh: translations.zh,
          en: translations.en,
          'zh-TW': translations['zh-TW']
        };

        // 调用server function只做数据库更新
        await updateMemoCardTranslation(id, finalTranslations);

        // 同步更新本地状态
        props.onTranslationUpdate?.(finalTranslations);

      } catch (error) {
        console.error('更新翻译失败:', error);
      }
    }
  }

  function handleDictationFocusChange(state: string) {
    setIsDictationFocused(state === 'focus');
  }



  return (
    <Card className={`${weakBorder ? '' : 'shadow-neumorphic'} w-[86%] m-auto text-[17px] relative p-5 pt-[22px] border ${weakBorder ? 'border-gray-200' : ''} text-left leading-[1.9] tracking-[1.5px]`}>
      {!hideCreateTime && (
        <div suppressHydrationWarning className={`-top-[30px] left-1 absolute text-[#999] text-[16px] sm:text-[14px]`}>
          {createTime ? getTimeAgo(createTime.toString(), locale) : ""}
        </div>
      )}
      {/* 右上角：仅问号按钮 */}
      <ContextButton
        contextUrl={contextUrl}
        onGrammarAnalysis={() => setShowGrammarDialog(true)}
        showOnlyHelp
      />

      {/* 顶部：头像 + 原文气泡（含小TTS） */}
      <div className="mb-[16px]">
        <AvatarSpeechBubble
          avatarUrl={characterAvatarUrl || channelAvatarUrl}
          displayName={characterName}
          originalText={originalText || ''}
          showBlur={isDictationFocused}
          memoCardId={id}
          rubyOriginalTextRecord={kanaPronunciation ?? undefined}
          rubyTranslationRecord={rubyTranslations ?? undefined}
        />
      </div>

      {/* 翻译（可编辑，保持与旧版一致） */}
      <div className="mt-[8px] mb-[16px]">
        <span
          suppressContentEditableWarning
          contentEditable
          ref={translationTextRef}
          onFocus={handleTranslationFocus}
          onBlur={handleTranslationBlur}
          className={`pr-[42px] outline-none font-Default text-[18px] whitespace-pre-wrap`}
        >
          {getTranslationByLocale(translation, locale)}
        </span>
      </div>

      {/* 问 AI 区域 */}
      <AskAISection
        memoCard={{
          id,
          originalText,
          translation,
          contextInfo: (props as any).contextInfo,
          messages: (props as any).messages,
        }}
      />

      {/* 问题设置（暂时隐藏，组件保留） */}
        {/* {(props as any).shouldShowQuestionEntry ? (
          <div className="flex items-center gap-2 mb-[16px] leading-[0.5px]">
            <Select
              value={questionType || undefined}
              onValueChange={async (newType) => {
                setQuestionType(newType);
                const text = (questionInput || '').trim();
                if (text) {
                  updateMemoCardQuestion({ memoCardId: id, questionText: text, sourceLang: 'zh', questionType: newType ? newType as QuestionType : null });
                } else {
                  updateMemoCardQuestionType({ memoCardId: id, questionType: newType ? newType as QuestionType : null });
                }
              }}
            >
              <SelectTrigger className="w-[160px] h-11">
                <SelectValue placeholder={tCard('question.type.none')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="description">{tCard('question.type.description')}</SelectItem>
                <SelectItem value="reading">{tCard('question.type.reading')}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onBlur={() => {
                const text = (questionInput || '').trim();
                if (!text) return;
                updateMemoCardQuestion({ memoCardId: id, questionText: text, sourceLang: 'zh', questionType: questionType ? questionType as QuestionType : null });
              }}
              placeholder={tCard('question.placeholder')}
              className="flex-1 h-11"
            />
          </div>
        ) : null} */}

      {/* 录音与播放 */}
      <RecordingControls weakBorder={weakBorder} setDisplayCards={setDisplayCards} id={id} />

      {/* 默写框 */}
      <div className="mb-0">
        {originalText ? (
          <Dictation
            originalText={originalText}
            cardID={id}
            weakBorder={weakBorder}
            setDisplayCards={setDisplayCards}
            onBlurChange={handleDictationFocusChange}
          />
        ) : null}
      </div>

      {showGrammarDialog && (
        <GrammarAnalysisDialog
          memoCard={{ id, originalText, translation } as any}
          setDisplayCards={setDisplayCards as any}
          onClose={() => setShowGrammarDialog(false)}
        />
      )}
    </Card>
  );
}


