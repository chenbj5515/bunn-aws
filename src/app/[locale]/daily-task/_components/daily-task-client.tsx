"use client";

import type { memoCard, wordCard, videos } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import type { WordSegmentation } from "@/types/extended-memo-card";
import { useRef, useCallback } from "react";
import { Provider, useSetAtom, useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { AnimatePresence, motion } from "framer-motion";
import { SETTLEMENT_VIDEO_URL } from "@/constants/utils";
import { StartTaskView } from "./start-task-view";
import { TvTaskView } from "./tv-task-view";
import { VideoPlayer, type DailyTaskVideoPlayerHandle } from "./video-player";
import { ChoiceQuestion } from "./choice-question";
import { SentenceBuilding } from "./sentence-building";
import { Settlement } from "./settlement";
import {
    store,
    TaskPhase,
    dailyTaskStateAtom,
    createInitialState,
    startTaskAtom,
    taskViewDataAtom,
    currentCardAtom,
    resultsAtom,
    submitChoiceAtom,
    submitSentenceAndContinueAtom,
} from "../_store";

/**
 * 解锁浏览器音频播放限制
 * 通过创建 AudioContext 并恢复来获取用户交互权限
 * 必须在用户手势（如点击）的同步调用链中调用
 */
function unlockBrowserAudio(): void {
    try {
        // 创建并立即恢复 AudioContext 来解锁音频
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
            const audioContext = new AudioContextClass();
            // 恢复音频上下文（这是关键步骤）
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            // 创建一个静音的音频节点并播放，进一步确保解锁
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 0; // 静音
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(0);
            oscillator.stop(0.001);
            // 不需要保持 audioContext，让它被垃圾回收
        }
    } catch (e) {
        console.warn('Failed to unlock browser audio:', e);
    }
}

type MemoCard = InferSelectModel<typeof memoCard>;
type WordCard = InferSelectModel<typeof wordCard>;
type Video = InferSelectModel<typeof videos>;

export interface ExtendedMemoCard extends Omit<MemoCard, 'wordSegmentation'> {
    wordSegmentation: WordSegmentation | null;
    words: WordCard[];
    video: Video | null;
}

interface DailyTaskClientProps {
    extendedMemoCards: ExtendedMemoCard[];
    initialAchievementPoints: number;
}

// 视图切换动画配置
const viewTransitionVariants = {
    initial: {
        opacity: 0,
        scale: 0.96,
    },
    animate: {
        opacity: 1,
        scale: 1,
    },
    exit: {
        opacity: 0,
        scale: 0.96,
    },
};

const viewTransitionConfig = {
    duration: 0.35,
    ease: [0.22, 1, 0.36, 1] as const, // 流畅的贝塞尔曲线
};

// 内部组件：使用 hooks 需要在 Provider 内部
function DailyTaskClientInner({ extendedMemoCards, initialAchievementPoints }: DailyTaskClientProps) {
    // 初始化 store（类似 useState 的初始值，只在首次渲染时生效）
    useHydrateAtoms([[dailyTaskStateAtom, createInitialState(extendedMemoCards)]], {
        store,
    });

    const { phase, currentRoundIndex, totalCards } = useAtomValue(taskViewDataAtom);
    const currentCard = useAtomValue(currentCardAtom);
    const results = useAtomValue(resultsAtom);
    const startTask = useSetAtom(startTaskAtom);
    const submitChoice = useSetAtom(submitChoiceAtom);
    const submitSentenceAndContinue = useSetAtom(submitSentenceAndContinueAtom);
    
    // VideoPlayer ref，用于在用户交互时解锁音频
    const videoPlayerRef = useRef<DailyTaskVideoPlayerHandle>(null);

    // 处理开始任务
    // 重要：必须在用户点击的同步调用链中解锁音频
    const handleStart = () => {
        // 1. 首先解锁浏览器音频权限（必须在用户手势的同步调用链中）
        unlockBrowserAudio();
        
        // 2. 同步调用 VideoPlayer 的 unlockAudio（如果已渲染）
        videoPlayerRef.current?.unlockAudio();
        
        // 3. 启动任务
        startTask();
    }

    // 处理选择题完成
    const handleChoiceComplete = (allCorrect: boolean) => {
        submitChoice(allCorrect);
    };

    // 处理拼句子完成
    const handleSentenceComplete = (isCorrect: boolean) => {
        submitSentenceAndContinue(isCorrect);
    };

    // 获取第一张卡片的视频 URL（用于预加载）
    const firstVideoUrl = extendedMemoCards[0]?.contextUrl;
    // 获取当前卡片的视频 URL
    const videoUrl = currentCard?.contextUrl;

    // 判断是否显示任务视图（非 IDLE 且非 COMPLETED）
    const showTaskView = phase !== TaskPhase.IDLE && phase !== TaskPhase.COMPLETED;
    
    // 是否需要预渲染视频播放器（IDLE 状态时预渲染，用于解锁音频）
    const shouldPreRenderVideo = phase === TaskPhase.IDLE && firstVideoUrl;

    return (
        <div className="relative w-full h-full">
            <AnimatePresence mode="wait">
                {phase === TaskPhase.IDLE && (
                    <motion.div
                        key="start-view"
                        variants={viewTransitionVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={viewTransitionConfig}
                        className="absolute inset-0"
                    >
                        <StartTaskView onStart={handleStart} />
                        {/* 预渲染视频播放器（隐藏），用于在用户点击时解锁音频 */}
                        {shouldPreRenderVideo && (
                            <div className="absolute opacity-0 w-1 h-1 overflow-hidden pointer-events-none" aria-hidden="true">
                                <VideoPlayer ref={videoPlayerRef} url={firstVideoUrl} />
                            </div>
                        )}
                    </motion.div>
                )}

                {/* 任务视图：电视 + 选择题 */}
                {showTaskView && (
                    <motion.div
                        key="task-view"
                        variants={viewTransitionVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={viewTransitionConfig}
                        className="absolute inset-0 overflow-y-auto"
                    >
                        {/* 电视和视频播放器始终显示 */}
                        <TvTaskView
                            total={totalCards}
                            completed={currentRoundIndex}
                            streak={0}
                        >
                            {videoUrl && <VideoPlayer ref={videoPlayerRef} url={videoUrl} />}
                        </TvTaskView>

                        {/* CHOICE_QUESTION 阶段：选择题弹窗居中显示 */}
                        {phase === TaskPhase.CHOICE_QUESTION && currentCard && (
                            <div className="z-10 fixed inset-0 flex justify-center items-center">
                                {/* 毛玻璃背景遮罩 */}
                                <div className="absolute inset-0 bg-white/30 backdrop-blur-md" />
                                {/* 选择题弹窗 */}
                                <div className="z-10 relative">
                                    <ChoiceQuestion
                                        memoCard={currentCard}
                                        onComplete={handleChoiceComplete}
                                    />
                                </div>
                            </div>
                        )}

                        {/* SENTENCE_BUILDING 阶段：拼句子弹窗居中显示 */}
                        {phase === TaskPhase.SENTENCE_BUILDING && currentCard && (
                            <div className="z-10 fixed inset-0 flex justify-center items-center">
                                {/* 毛玻璃背景遮罩 */}
                                <div className="absolute inset-0 bg-white/30 backdrop-blur-md" />
                                {/* 拼句子弹窗 */}
                                <div className="z-10 relative">
                                    <SentenceBuilding
                                        memoCard={currentCard}
                                        onComplete={handleSentenceComplete}
                                    />
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* COMPLETED 阶段：结算页面 */}
                {phase === TaskPhase.COMPLETED && (
                    <motion.div
                        key="settlement-view"
                        variants={viewTransitionVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={viewTransitionConfig}
                        className="absolute inset-0"
                    >
                        <Settlement
                            results={results}
                            initialPoints={initialAchievementPoints}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// 外层组件：提供统一的 store
export function DailyTaskClient({ extendedMemoCards, initialAchievementPoints }: DailyTaskClientProps) {
    return (
        <Provider store={store}>
            {/* 预加载结算视频 */}
            <link rel="preload" href={SETTLEMENT_VIDEO_URL} as="video" type="video/mp4" />
            <DailyTaskClientInner 
                extendedMemoCards={extendedMemoCards} 
                initialAchievementPoints={initialAchievementPoints}
            />
        </Provider>
    );
}