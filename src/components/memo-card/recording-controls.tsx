"use client"

import React, { useState, useRef, useEffect } from "react";
import { Play, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useTranslations } from 'next-intl';

interface RecordingControlsProps {
    weakBorder?: boolean;
    setDisplayCards?: React.Dispatch<React.SetStateAction<any>>;
    id?: string;
}

export function RecordingControls({ weakBorder = false, setDisplayCards, id }: RecordingControlsProps) {
    const t = useTranslations('components.recordingControls');
    const [state, setState] = useState<"idle" | "recording" | "completed">("idle");
    const [isBreathing, setIsBreathing] = useState(true);
    const [audioURL, setAudioURL] = useState<string | null>(null);
    const [volume, setVolume] = useState<number[]>(Array(20).fill(2));

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // 呼吸效果
    useEffect(() => {
        if (state === "idle") {
            const breathingInterval = setInterval(() => {
                setIsBreathing((prev) => !prev);
            }, 1500);

            return () => clearInterval(breathingInterval);
        }
    }, [state]);

    // 清理资源
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }

            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }

            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    // 开始录音
    const startRecording = async () => {
        try {
            // 获取麦克风流
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // 创建音频上下文和分析器
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyserRef.current = analyser;

            // 配置分析器
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.3;

            // 创建数据数组
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            dataArrayRef.current = dataArray;

            // 连接音频源到分析器
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            // 创建媒体录制器
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
                const url = URL.createObjectURL(audioBlob);
                setAudioURL(url);
            };

            // 开始录音
            mediaRecorder.start();
            setState("recording");

            // 开始音量可视化
            updateVisualizer();

            // 设置静音检测
            setupSilenceDetection();
        } catch (error) {
            console.error("Error accessing microphone:", error);
        }
    };

    // 音量可视化
    const updateVisualizer = () => {
        if (state !== "recording" || !analyserRef.current || !dataArrayRef.current) return;

        // 获取频率数据
        analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>);

        // 计算新的音量数组
        const newVolume = Array(20)
            .fill(0)
            .map((_, i) => {
                // 使用不同频率范围的数据
                const index = Math.floor((i * dataArrayRef.current!.length) / 20);
                // 映射到高度，最大值255映射到30
                return Math.max(2, Math.min(30, dataArrayRef.current?.[index] ?? 0 / 8));
            });

        setVolume(newVolume);

        // 继续更新
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    };

    // 设置静音检测
    const setupSilenceDetection = () => {
        silenceTimeoutRef.current = setInterval(() => {
            if (!analyserRef.current || !dataArrayRef.current) return;

            // 获取频率数据
            analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>);

            // 计算平均音量
            let sum = 0;
            for (let i = 0; i < dataArrayRef.current.length; i++) {
                sum += dataArrayRef.current?.[i] ?? 0;
            }
            const average = sum / dataArrayRef.current.length;

            // 如果音量低于阈值，停止录音
            if (average < 10) {
                stopRecording();
            }
        }, 2000); // 每2秒检查一次
    };

    // 停止录音
    const stopRecording = () => {
        if (mediaRecorderRef.current && state === "recording") {
            // 停止录音
            mediaRecorderRef.current.stop();

            // 停止所有轨道
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }

            // 清除计时器
            if (silenceTimeoutRef.current) {
                clearInterval(silenceTimeoutRef.current);
                silenceTimeoutRef.current = null;
            }

            // 停止可视化
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            // 更新状态
            setState("completed");

            // 录音完成后，执行 setDisplayCards (暂时设置占位符)
            if (setDisplayCards && id) {
                setDisplayCards((prev: any) => {
                    if (Array.isArray(prev)) {
                        return prev.map((card: any) => {
                            if (card.id === id) {
                                return { ...card, recordFilePath: "recording_pending_upload" };
                            }
                            return card;
                        });
                    }
                    return prev;
                });
            }
        }
    };

    // 播放录音
    const playRecording = () => {
        if (audioURL && audioRef.current) {
            audioRef.current.play();
        }
    };


    // 重置
    const resetRecording = () => {
        if (audioURL) {
            URL.revokeObjectURL(audioURL);
        }
        setAudioURL(null);
        setState("idle");
        setVolume(Array(20).fill(2));
    };

    // 处理按钮点击
    const handleButtonClick = () => {
        if (state === "idle") {
            startRecording();
        } else if (state === "recording") {
            stopRecording();
        } else if (state === "completed") {
            playRecording();
        }
    };

    return (
        <div className="flex flex-col justify-center items-center gap-4">
            <div className="relative">
                {/* 重置按钮 */}
                {state === "completed" && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            resetRecording()
                        }}
                        className="top-1/2 -left-12 absolute flex justify-center items-center shadow-neumorphic hover:shadow-neumorphic-button-hover rounded-full w-8 h-8 transition-colors -translate-y-1/2"
                    >
                        <RotateCcw className="w-4 h-4 text-gray-600" />
                    </button>
                )}


                <div
                    onClick={handleButtonClick}
                    className={`flex justify-center items-center bg-[rgb(247, 247, 247)] ${state === "recording" ? "shadow-neumorphic-button-hover" : "shadow-neumorphic"} hover:shadow-neumorphic-button-hover rounded-full w-[64px] h-[64px] transition-all cursor-pointer`}
                >
                    {state === "idle" && (
                        <Image src="/images/microphone.png" alt="mic" width={32} height={32} />
                    )}

                    {state === "recording" && (
                        <div className="bg-red-500 rounded-full w-6 h-6 animate-pulse" />
                    )}

                    {state === "completed" && (
                        <Play className="w-6 h-6 text-[#333]" />
                    )}
                </div>
            </div>

            {/* 录音状态文字 */}
            {state === "recording" && <div className="font-medium text-red-500 text-sm">{t('recording')}</div>}

            {/* 隐藏的音频元素 */}
            <audio ref={audioRef} src={audioURL || undefined} />
        </div>
    );
} 