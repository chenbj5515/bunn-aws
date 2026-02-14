"use client"
import React from "react";
import { MemoCardV2 as MemoCard } from "@/components/memo-card";
import { useLocale, useTranslations } from "next-intl";
import { useAudioPermission } from "@/hooks/audio";

type DemoCardProps = {
    type?: 'youtubeSubtitle' | 'netflixSubtitle' | 'contextText' | 'normalText';
    hideCreateTime?: boolean;
    width?: string | number;
    height?: string | number;
    mode?: "Comprehensible input" | "Standard";
}

export function DemoCard({ type = 'contextText', hideCreateTime = false, width, height, mode }: DemoCardProps) {
    const t = useTranslations('memoCards')
    const locale = useLocale();
    useAudioPermission();

    // 根据当前locale返回相应语言版本的日语句子分析
    const getSentenceAnalysis = () => {
        // 保留原始的日语部分
        const originalSentence = "人より速く走れるんだろ？";
        
        if (locale === 'zh') {
            return `
# 句子分析

## 原句

${originalSentence}

## 含义解释

这句话的意思是"你比别人跑得快，对吧？"这表明说话者在询问对方确认他们的速度，暗示他们认为这个人跑得比其他人快。

## 关键词、短语和语法点
- **人 (ひと)**: 意思是"人"或"人们"。在这个句子中，它指的是"其他人"，表示一种比较。
- **より (yori)**: 这是一个用于表示比较的助词。在这里，它表示"比"，如"比...更快"。它表明主语正在与他人进行比较。
- **速く (はやく)**: 这是"快"(速い, hayai)的副词形式。在句子中，它描述了主语如何跑步，强调速度。
- **走れる (はしれる)**: 这是动词"跑"(走る, hashiru)的可能形式。可能形式表示能力，所以"走れる"意味着"能跑"。它表明这个人有能力快速奔跑。
- **んだろ (n daro)**: 这是一个口语表达，结合了"の"(no)和"だろ"(daro)。它用于寻求确认或同意。在这种情况下，它可以翻译为"对吧？"或"不是吗？"表明说话者期望听者同意他们的陈述。

## 总结

这句话是一种询问某人确认他们是否比别人跑得快的随意方式。比较的使用、能力表达和寻求确认的语气清楚地表明说话者相信听者的速度。
`;
        } else if (locale === 'zh-TW') {
            return `
# 句子分析

## 原句

${originalSentence}

## 含義解釋

這句話的意思是"你比別人跑得快，對吧？"這表明說話者在詢問對方確認他們的速度，暗示他們認為這個人跑得比其他人快。

## 關鍵詞、短語和語法點
- **人 (ひと)**: 意思是"人"或"人們"。在這個句子中，它指的是"其他人"，表示一種比較。
- **より (yori)**: 這是一個用於表示比較的助詞。在這裡，它表示"比"，如"比...更快"。它表明主語正在與他人進行比較。
- **速く (はやく)**: 這是"快"(速い, hayai)的副詞形式。在句子中，它描述了主語如何跑步，強調速度。
- **走れる (はしれる)**: 這是動詞"跑"(走る, hashiru)的可能形式。可能形式表示能力，所以"走れる"意味著"能跑"。它表明這個人有能力快速奔跑。
- **んだろ (n daro)**: 這是一個口語表達，結合了"の"(no)和"だろ"(daro)。它用於尋求確認或同意。在這種情況下，它可以翻譯為"對吧？"或"不是嗎？"表明說話者期望聽者同意他們的陳述。

## 總結

這句話是一種詢問某人確認他們是否比別人跑得快的隨意方式。比較的使用、能力表達和尋求確認的語氣清楚地表明說話者相信聽者的速度。
`;
        } else {
            // 默认英文
            return `
# Sentence Analysis

## Original Sentence

${originalSentence}

## Meaning Explanation

The sentence translates to "You're faster than the rest, right?" It implies that the speaker is asking for confirmation about someone's speed, suggesting that they believe this person can run faster than others.

## Key Words, Phrases, and Grammar Points
- **人 (hito)**: This means "person" or "people." In the context of the sentence, it refers to "others" or "the rest," indicating a comparison with other individuals.
- **より (yori)**: This is a particle used to indicate comparison. Here, it means "than," as in "faster than." It shows that the subject is being compared to others.
- **速く (hayaku)**: This is the adverbial form of "fast" (速い, hayai). In the sentence, it describes how the subject runs, emphasizing the speed.
- **走れる (hashireru)**: This is the potential form of the verb "走る" (hashiru), which means "to run." The potential form indicates ability, so "走れる" means "can run." It suggests that the person has the ability to run fast.
- **んだろ (n daro)**: This is a colloquial expression that combines "の" (no) and "だろ" (daro). It is used to seek confirmation or agreement. In this context, it translates to "right?" or "isn't it?" It indicates that the speaker expects the listener to agree with their statement.

## Summary

The sentence is a casual way of asking someone to confirm that they can run faster than others. The use of comparison, ability, and a seeking confirmation tone makes it clear that the speaker believes in the listener's speed.
`;
        }
    };

    const demoDataMap = {
        youtubeSubtitle: {
            id: "",
            highlightSentenceId: null,
            translation: t('demoTranslation1'),
            createTime: new Date("2025-02-24T16:30:57.848Z").toISOString(),
            updateTime: new Date("2025-02-24T16:31:17.123Z").toISOString(),
            recordFilePath: "",
            originalText: "それ聞くの野暮だよお",
            reviewTimes: 0,
            userId: "",
            kanaPronunciation: "それきくのやぼだよお",
            contextUrl: "https://www.youtube.com/watch?v=9dS3EKcvofQ&t=146",
            forgetCount: 0,
            lastCorrectTime: null,
            lastWrongTime: null,
            rubyTranslations: "",
            platform: "youtube",
            seriesId: null,
            channelId: null,
            characterId: null,
            bookId: null,
            videoId: null,
            avatarUrl: null,
            wordSegmentation: null,
            contextInfo: [],
            adminPreTranslations: null,
            // 卡片自定义问题相关字段
            question: null,
            questionType: null,
            hasQuestionAnswerSubmission: false,
            questionAnswerSubmissions: null,
            lastQuestionAnswerSubmittedAt: null,
            wordCardCount: 0
        },
        netflixSubtitle: {
            id: "",
            highlightSentenceId: null,
            translation: t('demoTranslation3'),
            createTime: new Date("2025-02-24T16:30:57.848Z").toISOString(),
            updateTime: new Date("2025-02-24T16:31:17.123Z").toISOString(),
            recordFilePath: "",
            originalText: "福岡に美人が多いという噂は伝説でもなんでもなく、もはや定説と言ってもいいでしょう。",
            reviewTimes: 0,
            userId: "",
            kanaPronunciation: "ふくおかにびじんがおおいといううわさはでんせつでもなんでもなく、もはやていせつといってもいいでしょう。",
            contextUrl: "https://gokant-go.sawarise.co.jp/fukuoka-cute/?scrollY=1046&text=%25E7%25A6%258F%25E5%25B2%25A1%25E3%2581%25AB%25E7%25BE%258E%25E4%25BA%25BA%25E3%2581%258C%25E5%25A4%259A%25E3%2581%2584%25E3%2581%25A8%25E3%2581%2584%25E3%2581%2586%25E5%2599%2582%25E3%2581%25AF%25E4%25BC%259D%25E8%25AA%25AC%25E3%2581%25A7%25E3%2582%2582%25E3%2581%25AA%25E3%2582%2593%25E3%2581%25A7%25E3%2582%2582%25E3%2581%25AA%25E3%2581%258F%25E3%2580%2581%25E3%2582%2582%25E3%2581%25AF%25E3%2582%2584%25E5%25AE%259A%25E8%25AA%25AC%25E3%2581%25A8%25E8%25A8%2580%25E3%2581%25A3%25E3%2581%25A6%25E3%2582%2582%25E3%2581%2584%25E3%2581%2584%25E3%2581%25A7%25E3%2581%2597%25E3%2582%2587%25E3%2581%2586%25E3%2580%2582",
            forgetCount: 0,
            lastCorrectTime: null,
            lastWrongTime: null,
            rubyTranslations: "",
            platform: "netflix",
            seriesId: null,
            channelId: null,
            characterId: null,
            bookId: null,
            videoId: null,
            avatarUrl: null,
            wordSegmentation: null,
            contextInfo: [],
            adminPreTranslations: null,
            // 卡片自定义问题相关字段
            question: null,
            questionType: null,
            hasQuestionAnswerSubmission: false,
            questionAnswerSubmissions: null,
            lastQuestionAnswerSubmittedAt: null,
            wordCardCount: 0
        },
        contextText: {
            id: "",
            highlightSentenceId: null,
            translation: t('demoTranslation7'),
            createTime: new Date("2025-02-24T16:30:57.848Z").toISOString(),
            updateTime: new Date("2025-02-24T16:31:17.123Z").toISOString(),
            recordFilePath: "",
            originalText: "人より速く走れるんだろ？",
            reviewTimes: 0,
            userId: "",
            kanaPronunciation: '```json{    "tag": "span",    "children": [        {            "tag": "ruby",            "text": "人",            "rt": "ひと"        },        "より",        {            "tag": "ruby",            "text": "速く",            "rt": "はやく"        },        {            "tag": "ruby",            "text": "走れる",            "rt": "はしれる"        },        "んだろ？"    ]}```',
            contextUrl: "https://www.netflix.com/watch/81496133?trackId=14170286&t=1355",
            forgetCount: 0,
            lastCorrectTime: null,
            lastWrongTime: null,
            rubyTranslations: `{
                "人": "person",
                "速く": "faster",
                "走れる": "run"
            }`,
            platform: "web",
            seriesId: "",
            channelId: null,
            characterId: null,
            bookId: null,
            videoId: null,
            avatarUrl: null,
            messages: [
                {
                    id: "",
                    role: "assistant",
                    content: getSentenceAnalysis(),
                    createTime: new Date("2025-02-24T16:30:57.848Z").toISOString(),
                    isInitialAnalysis: true,
                    messageOrder: 0
                }
            ],
            wordSegmentation: null,
            contextInfo: [],
            adminPreTranslations: null,
            // 卡片自定义问题相关字段
            question: null,
            questionType: null,
            hasQuestionAnswerSubmission: false,
            questionAnswerSubmissions: null,
            lastQuestionAnswerSubmittedAt: null,
            wordCardCount: 0
        },
        normalText: {
            id: "",
            highlightSentenceId: null,
            translation: t('demoTranslation4'),
            createTime: new Date("2025-02-24T16:30:57.848Z").toISOString(),
            updateTime: new Date("2025-02-24T16:31:17.123Z").toISOString(),
            recordFilePath: "",
            originalText: "CursorのProject Rules運用のベストプラクティスを探る",
            reviewTimes: 0,
            userId: "",
            kanaPronunciation: "カーソルのぷろじぇくと るーるすうんようのべすとぷらくてぃすをさぐる",
            contextUrl: "",
            forgetCount: 0,
            lastCorrectTime: null,
            lastWrongTime: null,
            rubyTranslations: "",
            platform: "other",
            seriesId: null,
            channelId: null,
            characterId: null,
            bookId: null,
            videoId: null,
            avatarUrl: null,
            wordSegmentation: null,
            contextInfo: [],
            adminPreTranslations: null,
            // 卡片自定义问题相关字段
            question: null,
            questionType: null,
            hasQuestionAnswerSubmission: false,
            questionAnswerSubmissions: null,
            lastQuestionAnswerSubmittedAt: null,
            wordCardCount: 0
        }
    }

    return (
        <MemoCard
            {...demoDataMap[type]}
            onDelete={() => { }}
            weakBorder
            hideCreateTime={hideCreateTime}
            width={width}
            height={height}
            mode={mode}
        />
    );
}
