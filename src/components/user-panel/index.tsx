"use client"
import { useRouter, usePathname } from "next/navigation"
import { useLocale, useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LanguageSelector } from "./language-selector"
import { Link } from '@/i18n/navigation'
import { signOut } from "@/lib/auth-client"
import { ChevronRight, ArrowLeft, Play, Mic, Circle, Check } from "lucide-react"
import { useAudioRecorder } from "./hooks/audio"
import { LoadingButton } from "@/components/ui/loading-button"
import * as recMod from './lib/recorder'
import { Separator } from "@/components/ui/separator"
import { createPortalSession } from "./server-functions/create-portal-session"
import React, { type ReactElement } from "react"
import dayjs from "dayjs"
import { UserBadge } from "@/components/badges/user-badge"
import { useEffect, useState, useRef } from "react"
import { trpc } from "@/lib/trpc-client"

interface UserPanelProps {
    user: {
        id: string;
        email: string;
        image?: string | null;
    };
    subscription: {
        active: boolean;
        expireTime: string;
        type?: 'subscription' | 'oneTime' | null;
    };
    initialAchievementPoints?: number;
}

export default function UserPanel({ user, subscription, initialAchievementPoints = 0 }: UserPanelProps): ReactElement {
    const router = useRouter()
    const locale = useLocale()
    const pathname = usePathname()
    const t = useTranslations('LoginedHeader')

    const [achievementPoints] = useState(initialAchievementPoints)
    const { active, expireTime, subscriptionType } = {
        active: subscription.active,
        expireTime: subscription.expireTime ? new Date(subscription.expireTime) : null,
        subscriptionType: subscription.type
    }
    const [showTTSManager, setShowTTSManager] = useState(false)
    const [isSamplePlaying, setIsSamplePlaying] = useState(false)
    const [isSamplePaused, setIsSamplePaused] = useState(false)
    const [isMESamplePlaying, setIsMESamplePlaying] = useState(false)
    const [isMESamplePaused, setIsMESamplePaused] = useState(false)
    const [isMESampleLoading, setIsMESampleLoading] = useState(false)
    const [recordState, setRecordState] = useState<'idle' | 'recording' | 'recorded' | 'playing'>('idle')
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const meAudioRef = useRef<HTMLAudioElement | null>(null)
    const { startRecording, stopRecording, playRecording, getAudioBlob, hasRecording } = useAudioRecorder()
    const [isUploading, setIsUploading] = useState(false)
    const [uploadSuccess, setUploadSuccess] = useState(false)
    const [hasCustomVoice, setHasCustomVoice] = useState(false) // 是否有自定义声音
    const [isUsingCustom, setIsUsingCustom] = useState(false) // 当前是否正在使用自定义声音
    const [ttsPreference, setTtsPreference] = useState<'haruka' | 'custom'>('haruka')
    const [currentVoiceId, setCurrentVoiceId] = useState<string | null>(null)
    const [recordingError, setRecordingError] = useState<string | null>(null) // 录音错误信息
    const [ttsSampleError, setTtsSampleError] = useState<string | null>(null) // TTS 示例播放错误（如限流）
    const ADMIN_USER_ID = 'e390urIOYotFcXkyOXY0MxxrgJcfyiHq'

    // 头像本地缓存（避免返回后闪烁）
    const [avatarSrc, setAvatarSrc] = useState<string | undefined>(undefined)

    useEffect(() => {
        const cached = localStorage.getItem(`userAvatarUrl`)
        if (cached) setAvatarSrc(cached)
    }, [])

    // 将图片URL转换为blob data URL并存储
    const storeAvatarAsBlob = async (imageUrl: string) => {
        try {
            const response = await fetch(imageUrl)
            if (!response.ok) return

            const blob = await response.blob()
            const reader = new FileReader()

            reader.onload = () => {
                const dataUrl = reader.result as string
                localStorage.setItem(`userAvatarUrl`, dataUrl)
                setAvatarSrc(dataUrl)
            }

            reader.readAsDataURL(blob)
        } catch (error) {
            console.error('头像转换为blob失败:', error)
            // 降级到直接使用URL
            localStorage.setItem(`userAvatarUrl`, imageUrl)
            setAvatarSrc(imageUrl)
        }
    }

    useEffect(() => {
        const image = user.image?.toString()
        if (!image) return
        storeAvatarAsBlob(image)
    }, [user.image])

    // 上传成功状态自动消失（3秒后）
    useEffect(() => {
        if (uploadSuccess) {
            const timer = setTimeout(() => {
                setUploadSuccess(false)
            }, 3000) // 3秒后自动消失

            return () => clearTimeout(timer)
        }
    }, [uploadSuccess])

    // 获取用户TTS偏好状态
    useEffect(() => {
        async function fetchTTSPreference() {
            try {
                const preferenceData = await trpc.tts.getPreference.query()
                const preferred = preferenceData.preferred || 'haruka'
                const voiceId = preferenceData.voiceId || null

                setTtsPreference(preferred)
                setCurrentVoiceId(voiceId)
                setIsUsingCustom(preferred === 'custom') // 当前是否正在使用自定义声音

                // 如果当前使用自定义声音且有voiceId，肯定有自定义声音
                if (preferred === 'custom' && voiceId) {
                    setHasCustomVoice(true)
                } else {
                    // 如果当前使用haruka或没有voiceId，我们仍然需要检查用户是否曾经录入过自定义声音
                    await checkHasCustomVoice()
                }
            } catch (error) {
                console.error('获取用户TTS偏好失败:', error)
            }
        }

        fetchTTSPreference()
    }, [])

    // 由RSC通过props传入，客户端不再主动拉取

    // 检查用户是否曾经录入过自定义声音
    async function checkHasCustomVoice() {
        try {

            // 从session API获取用户信息，检查是否曾经录入过自定义声音
            const response = await fetch('/api/user/session')
            if (response.ok) {
                const userData = await response.json()

                // 如果用户有ttsVoiceId记录，说明曾经录入过自定义声音
                const hasVoiceId = !!userData?.user?.ttsVoiceId

                setHasCustomVoice(hasVoiceId)
                if (hasVoiceId && !currentVoiceId) {
                    setCurrentVoiceId(userData.user.ttsVoiceId)
                }
            } else {

            }
        } catch (error) {
            console.error('检查自定义声音失败:', error)
            setHasCustomVoice(false)
        }
    }

    const formatExpireDate = (date: Date | string | null) => {
        if (!date) return '-';
        return dayjs(date).locale(locale).format('YYYY/MM/DD');
    }

    async function handleLogout() {
        await signOut()
        router.push(`/${locale}/home`)
    }

    async function handleManageSubscription() {
        try {
            const url = await createPortalSession()
            if (pathname.includes('/mobile')) {
                window.location.href = url;
            } else {
                window.open(url, '_blank')
            }
        } catch (error) {
            console.error('Failed to create portal session:', error)
        }
    }

    // 切换TTS偏好
    async function handleSwitchTTSPreference(preferred: 'haruka' | 'custom') {
        try {
            // 立即更新UI
            setTtsPreference(preferred)
            setIsUsingCustom(preferred === 'custom')

            // 后台更新偏好（不阻塞UI）
            await trpc.tts.setPreference.mutate({
                preferred,
                voiceId: preferred === 'custom' ? currentVoiceId ?? undefined : undefined,
            })
        } catch (error) {
            console.error('切换TTS偏好失败:', error)
        }
    }

    // 判断是否显示订阅管理按钮（只有订阅有效且类型是subscription才显示）
    const showSubscriptionManagement = active && subscriptionType === 'subscription';

    function renderDefaultContent() {
        return (
            <>
                <div className="flex justify-between items-center px-2 h-10">
                    <p className="pr-2 font-medium sm:text-sm text-base truncate">{user.email}</p>
                    <Link href="/badges" className="shrink-0">
                        <UserBadge
                            achievementPoints={achievementPoints}
                            size="xs"
                            className="cursor-pointer"
                        />
                    </Link>
                </div>
                {/* 文本语言设置：左文案 + 右选择器（隐藏图标） */}
                <div className="flex justify-between items-center px-2 w-full h-10">
                    <p className="font-medium sm:text-sm text-base">{t('languageLabel')}</p>
                    <LanguageSelector showIcon={false} textClassName="" />
                </div>
                <div className="flex items-center h-10">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="justify-between shadow-none! focus-visible:shadow-none p-[8px] border-0! focus-visible:border-0 focus:border-0 border-none rounded-none outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full h-full sm:text-sm text-base"
                        onClick={() => {
                            const pricingPath = pathname.includes('/mobile') ? `/${locale}/mobile/pricing` : `/${locale}/pricing`;
                            if (pathname.includes('/mobile')) {
                                router.push(pricingPath);
                            } else {
                                window.open(pricingPath, '_blank');
                            }
                        }}
                    >
                        <p className="font-medium sm:text-sm text-base">{t('membershipPlan')}</p>
                        <span className="sm:text-sm text-base">
                            {active ? 'Premium' : 'Free'}
                        </span>
                    </Button>
                </div>
                {active && expireTime && (
                    <div className="flex justify-between items-center px-2 h-10">
                        <p className="font-medium sm:text-sm text-base">{t('expiryDate')}</p>
                        <span className="sm:text-sm text-base">{formatExpireDate(expireTime)}</span>
                    </div>
                )}
                <div className="flex items-center h-10">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="justify-between shadow-none! focus-visible:shadow-none p-[8px] border-0! focus-visible:border-0 focus:border-0 border-none rounded-none outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full h-full sm:text-sm text-base"
                        onClick={() => {
                            setShowTTSManager(true)
                            setTtsSampleError(null)
                            setRecordingError(null)
                        }}
                    >
                        <p className="font-medium sm:text-sm text-base">{t('ttsManage')}</p>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
                {showSubscriptionManagement && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="justify-between shadow-none! focus-visible:shadow-none p-[8px] border-0! focus-visible:border-0 focus:border-0 border-none rounded-none outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full h-10 sm:text-sm text-base"
                        onClick={handleManageSubscription}
                    >
                        {t('subscriptionManagement')}
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                )}
                <Separator className="mt-[8px]! mb-[8px]!" />
                <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start shadow-none! focus-visible:shadow-none p-[8px] border-0! focus-visible:border-0 focus:border-0 rounded-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full h-10 sm:text-sm text-base"
                    onClick={handleLogout}
                >
                    {t('logout')}
                </Button>
            </>
        )
    }

    function handlePlaySample() {
        try {
            // 如果正在播放，则暂停
            if (isSamplePlaying && !isSamplePaused && audioRef.current) {
                audioRef.current.pause()
                setIsSamplePaused(true)
                return
            }

            // 如果暂停了，则继续播放
            if (isSamplePlaying && isSamplePaused && audioRef.current) {
                audioRef.current.play()
                setIsSamplePaused(false)
                return
            }

            // 如果没有在播放，则开始新播放
            const audio = new Audio('https://filecdn.minimax.chat/public/aae58507-d631-4c36-8b37-86affa3c508d.mp3')
            audioRef.current = audio
            setIsSamplePlaying(true)
            setIsSamplePaused(false)

            // 监听播放结束事件
            audio.addEventListener('ended', () => {
                setIsSamplePlaying(false)
                setIsSamplePaused(false)
                audioRef.current = null
            })

            // 监听播放错误事件
            audio.addEventListener('error', () => {
                setIsSamplePlaying(false)
                setIsSamplePaused(false)
                audioRef.current = null
            })

            audio.play()
        } catch (e) {
            setIsSamplePlaying(false)
            setIsSamplePaused(false)
            audioRef.current = null
        }
    }

    // 处理ME示例音频播放
    async function handlePlayMESample() {
        try {
            // 如果正在loading中，禁止点击
            if (isMESampleLoading) {
                return
            }

            // 如果正在播放，则暂停
            if (isMESamplePlaying && !isMESamplePaused && meAudioRef.current) {
                meAudioRef.current.pause()
                setIsMESamplePaused(true)
                return
            }

            // 如果暂停了，则继续播放
            if (isMESamplePlaying && isMESamplePaused && meAudioRef.current) {
                meAudioRef.current.play()
                setIsMESamplePaused(false)
                return
            }

            // 如果没有在播放，则开始新播放
            // 设置loading状态，防止重复请求
            setIsMESampleLoading(true)

            const sampleText = "このたびは、音声生成サービスをご利用いただきありがとうございます。お好みの声をお選びいただき、音声創作の旅を楽しみましょう。"

            // 调用TTS API生成音频
            setTtsSampleError(null)
            const result = await trpc.tts.synthesize.mutate({
                text: sampleText,
                language: 'ja',
                skipCache: false
            })

            if (result.rateLimited) {
                setTtsSampleError('已达到使用限额')
                setIsMESampleLoading(false)
                return
            }

            // 将 base64 转换为 blob URL
            const binaryString = atob(result.audioBase64)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i)
            }
            const audioBlob = new Blob([bytes], { type: 'audio/mpeg' })
            const audioUrl = URL.createObjectURL(audioBlob)
            const audio = new Audio(audioUrl)
            meAudioRef.current = audio

            setIsMESamplePlaying(true)
            setIsMESamplePaused(false)
            setIsMESampleLoading(false) // 请求完成，清除loading状态

            // 监听播放结束事件
            audio.addEventListener('ended', () => {
                setIsMESamplePlaying(false)
                setIsMESamplePaused(false)
                meAudioRef.current = null
                URL.revokeObjectURL(audioUrl)
            })

            // 监听播放错误事件
            audio.addEventListener('error', () => {
                setIsMESamplePlaying(false)
                setIsMESamplePaused(false)
                meAudioRef.current = null
                URL.revokeObjectURL(audioUrl)
            })

            audio.play()
        } catch (e) {
            console.error('播放ME示例音频失败:', e)
            setTtsSampleError(e instanceof Error ? e.message : '播放失败')
            setIsMESamplePlaying(false)
            setIsMESamplePaused(false)
            setIsMESampleLoading(false)
            meAudioRef.current = null
        }
    }

    // 处理更换自己的声音
    function handleChangeVoice() {
        // 重置录音状态
        setRecordState('idle')
        setUploadSuccess(false)
        setRecordingError(null) // 清除错误信息

        // 停止任何正在播放的音频
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current = null
        }
        if (meAudioRef.current) {
            meAudioRef.current.pause()
            meAudioRef.current = null
        }

        // 重置播放状态
        setIsSamplePlaying(false)
        setIsSamplePaused(false)
        setIsMESamplePlaying(false)
        setIsMESamplePaused(false)
        setIsMESampleLoading(false) // 重置loading状态

        // 清除录音数据
        // 注意：这里我们不清除hasCustomVoice状态，因为用户只是想更换而不是删除
        // 录音完成后会生成新的voiceId并更新设置

        // 自动开始录音（模拟用户点击录音按钮）
        setTimeout(() => {
            setRecordingError(null) // 清除错误信息
            startRecording()
            setRecordState('recording')
        }, 100) // 短暂延迟确保状态重置完成
    }

    function handleRecordButton() {
        if (recordState === 'idle') {
            setRecordingError(null) // 清除错误信息
            startRecording()
            setRecordState('recording')
            return
        }
        if (recordState === 'recording') {
            try {
                setRecordingError(null) // 清除之前的错误信息
                stopRecording()
                setRecordState('recorded')
            } catch (error) {
                // 录音时长不足，显示错误信息
                if (error instanceof Error) {
                    setRecordingError(error.message)
                }
                // 不改变recordState，保持recording状态，让用户继续录音
            }
            return
        }
        if (recordState === 'recorded') {
            // 如果已经录制完成，点击按钮播放录音
            const blob = getAudioBlob()
            if (blob) {
                const audio = new Audio(URL.createObjectURL(blob))
                audioRef.current = audio

                audio.addEventListener('ended', () => {
                    setRecordState('recorded')
                    audioRef.current = null
                })
                audio.addEventListener('error', () => {
                    setRecordState('recorded')
                    audioRef.current = null
                })

                audio.play()
                setRecordState('playing')
            }
            return
        }
        if (recordState === 'playing') {
            // 如果正在播放，停止播放（回到recorded状态）
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.currentTime = 0
                audioRef.current = null
            }
            setRecordState('recorded')
            return
        }
    }

    function renderRecordIcon() {
        if (recordState === 'idle') {
            return <Mic className="w-4 h-4 transition-all duration-300 ease-in-out" />
        }
        if (recordState === 'recording') {
            return <Circle className="fill-red-500 w-4 h-4 text-red-500 transition-all duration-300 ease-in-out" />
        }
        if (recordState === 'recorded') {
            // 使用与Haruka完全相同的播放图标样式
            return <Play className="fill-black w-4 h-4 text-black transition-all duration-300 ease-in-out" />
        }
        if (recordState === 'playing') {
            // 使用与Haruka完全相同的暂停图标样式
            return (
                <div className="flex justify-center items-center w-4 h-4 transition-all duration-300 ease-in-out">
                    <div className="bg-black mx-0.5 w-1 h-4"></div>
                    <div className="bg-black mx-0.5 w-1 h-4"></div>
                </div>
            )
        }
        return <Mic className="w-4 h-4 transition-all duration-300 ease-in-out" />
    }

    function getRecordButtonText() {
        if (recordState === 'idle') {
            // 如果已经有自定义声音，显示"更换自己的声音"，否则显示"使用自己的声音"
            const textKey = hasCustomVoice ? 'changeOwnVoice' : 'useOwnVoice'
            return <span className="transition-all duration-300 ease-in-out">{t(textKey)}</span>
        }
        if (recordState === 'recording') {
            return <span className="transition-all duration-300 ease-in-out">{t('stopRecording')}</span>
        }
        if (recordState === 'recorded') {
            return <span className="transition-all duration-300 ease-in-out">{t('playRecording')}</span>
        }
        if (recordState === 'playing') {
            return <span className="transition-all duration-300 ease-in-out">{t('pausePlaying')}</span>
        }
        return <span className="transition-all duration-300 ease-in-out">{hasCustomVoice ? t('changeOwnVoice') : t('useOwnVoice')}</span>
    }

    async function handleUploadVoiceClone() {
        // 检查管理员权限
        if (user.id !== ADMIN_USER_ID) {
            console.error('[TTS Clone Frontend] 用户不是管理员，无权使用声音克隆功能');
            return;
        }

        try {
            const blob = getAudioBlob()
            if (!blob) {
                return
            }

            setIsUploading(true)
            setUploadSuccess(false)

            // 1) webm->wav 转换
            const wavBlob = await recMod.webmToWav(blob, { sampleRate: 32000, mono: true })
            const wavFile = new File([wavBlob], `record_${Date.now()}.wav`, { type: 'audio/wav' })

            // 验证时长
            const durSec = await recMod.getAudioDuration(wavBlob)
            if (durSec < 10 || durSec > 300) throw new Error(`音频时长不符合要求: ${durSec.toFixed(1)}s (需 10~300s)`)

            // 2) 生成自定义voiceId并发送 WAV 文件到克隆接口
            // 生成符合要求的voiceId：最少8字符，以字母开头，包含字母和数字
            const generateVoiceId = () => {
                const prefix = 'MiniMax'; // 以字母开头
                const randomNum = Math.floor(Math.random() * 10000); // 4位随机数字
                const randomStr = Math.random().toString(36).substring(2, 6); // 4位随机字母数字
                return `${prefix}${randomNum}${randomStr}`; // 格式如：MiniMax1234abcd
            };

            const customVoiceId = generateVoiceId();

            // 将 WAV 文件转换为 base64
            const arrayBuffer = await wavFile.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const audioBase64 = btoa(binary);

            const data = await trpc.tts.cloneVoice.mutate({
                audioBase64,
                voiceId: customVoiceId,
            })

            if (data.rateLimited) {
                setRecordingError('已达到使用限额')
                return
            }

            if (data.voiceId) {
                const vid = data.voiceId
                setUploadSuccess(true)
                setHasCustomVoice(true)
                setCurrentVoiceId(vid)
                setTtsPreference('custom') // 上传成功后自动切换到自定义语音
                setIsUsingCustom(true) // 更新使用状态
            } else {
                setRecordingError('克隆失败，未返回 voiceId')
            }
        } catch (e) {
            console.error('[TTS Clone Frontend] 克隆过程发生错误:', e);
            if (e instanceof Error) {
                console.error('[TTS Clone Frontend] 错误详情:', e.message);
            }
        } finally {
            setIsUploading(false)
        }
    }

    function renderTTSContent() {
        return (
            <>
                <div className="flex items-center px-2 h-10">
                    <button
                        type="button"
                        className="flex items-center text-[#000000]"
                        onClick={() => setShowTTSManager(false)}
                    >
                        <ArrowLeft className="mr-1 w-4 h-4" />
                        <span className="sm:text-sm text-base">{t('back')}</span>
                    </button>
                </div>

                {/* Haruka 条目 */}
                <div className="group relative flex items-center hover:bg-gray-100 rounded-md h-12 overflow-hidden transition-colors duration-200 cursor-pointer" onClick={handlePlaySample}>
                    <div className="z-1 relative flex items-center py-2 w-full">
                        <div className="group relative mr-3 w-10 h-10">
                            <img src="/assets/fresh-haruka.png" alt="fresh-haruka" className="rounded-md w-10 h-10" />
                            <div className={`absolute inset-0 bg-[#00000033] backdrop-blur-sm rounded-md pointer-events-none ${(isSamplePlaying || isSamplePaused) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200`} />
                            <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                                {isSamplePlaying && !isSamplePaused ? (
                                    <div className="flex justify-center items-center w-4 h-4">
                                        <div className="bg-white mx-0.5 w-1 h-4"></div>
                                        <div className="bg-white mx-0.5 w-1 h-4"></div>
                                    </div>
                                ) : (isSamplePlaying && isSamplePaused) ? (
                                    <Play className="w-4 h-4 text-[#ffffff]" fill="#ffffff" />
                                ) : (
                                    <Play className="opacity-0 group-hover:opacity-100 w-4 h-4 text-[#ffffff] transition-opacity duration-200" fill="#ffffff" />
                                )}
                            </div>
                        </div>
                        <span className="text-[#000000] sm:text-sm text-base">{t('freshHaruka')}</span>
                        {ttsPreference === 'haruka' ? (
                            <span className="bg-[#6D5EF3] ml-auto px-4 py-2 rounded-full font-medium text-[#ffffff] text-xs">Selected</span>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-[#111111] hover:bg-[#111111]/80 ml-auto px-4 py-2 border-0 rounded-full font-medium text-[#ffffff] hover:text-[#ffffff] text-xs"
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation()
                                    handleSwitchTTSPreference('haruka')
                                }}
                            >
                                <svg className="mr-1 w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17" fill="none">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M11.2553 1.57855C11.6109 1.48325 11.9765 1.69431 12.0718 2.04995L12.504 3.66317C12.6222 4.10417 12.3605 4.55746 11.9195 4.67562L10.3063 5.10788C9.95062 5.20318 9.58506 4.99212 9.48977 4.63648C9.39447 4.28084 9.60553 3.91528 9.96117 3.81998L10.1404 3.77196C7.73738 2.68046 4.85222 3.57196 3.50516 5.90513C2.76304 7.19052 2.63297 8.66021 3.02534 9.97994C3.13027 10.3329 2.92923 10.704 2.57631 10.809C2.22339 10.9139 1.85223 10.7128 1.7473 10.3599C1.25491 8.7038 1.41775 6.85396 2.35046 5.23846C4.07298 2.25497 7.79644 1.14698 10.8471 2.63092L10.7839 2.39504C10.6886 2.0394 10.8996 1.67384 11.2553 1.57855ZM5.15271 14.3691L5.21592 14.605C5.31121 14.9606 5.10016 15.3262 4.74451 15.4215C4.38887 15.5168 4.02331 15.3057 3.92802 14.9501L3.49576 13.3369C3.37759 12.8959 3.6393 12.4426 4.0803 12.3244L5.69352 11.8922C6.04916 11.7969 6.41472 12.0079 6.51001 12.3636C6.60531 12.7192 6.39425 13.0848 6.03861 13.1801L5.85939 13.2281C8.26241 14.3196 11.1476 13.4281 12.4946 11.0949C13.2367 9.80953 13.3668 8.33983 12.9744 7.0201C12.8695 6.66718 13.0705 6.29602 13.4235 6.19109C13.7764 6.08616 14.1476 6.2872 14.2525 6.64012C14.7449 8.29625 14.582 10.1461 13.6493 11.7616C11.9268 14.7451 8.20334 15.8531 5.15271 14.3691Z" fill="#ffffff"></path>
                                </svg>
                                Use
                            </Button>
                        )}
                    </div>
                </div>

                {/* 自己的声音条目：只有管理员且有自定义语音时才显示 */}
                {user.id === ADMIN_USER_ID && hasCustomVoice && (
                    <>
                        <div className="group relative flex items-center hover:bg-gray-100 rounded-md h-12 overflow-hidden transition-colors duration-200 cursor-pointer" onClick={handlePlayMESample}>
                            <div className="z-1 relative flex items-center py-2 w-full">
                                <div className="group relative mr-3 w-10 h-10">
                                    <img src="/assets/me.png" alt="me" className="rounded-md w-10 h-10" />
                                    <div className={`absolute inset-0 bg-[#00000033] backdrop-blur-sm rounded-md pointer-events-none ${(isMESamplePlaying || isMESamplePaused || isMESampleLoading) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200`} />
                                    <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                                        {isMESampleLoading ? (
                                            <div className="flex justify-center items-center w-4 h-4">
                                                <div className="border border-white border-t-transparent rounded-full w-3 h-3 animate-spin"></div>
                                            </div>
                                        ) : isMESamplePlaying && !isMESamplePaused ? (
                                            <div className="flex justify-center items-center w-4 h-4">
                                                <div className="bg-white mx-0.5 w-1 h-4"></div>
                                                <div className="bg-white mx-0.5 w-1 h-4"></div>
                                            </div>
                                        ) : (isMESamplePlaying && isMESamplePaused) ? (
                                            <Play className="w-4 h-4 text-[#ffffff]" fill="#ffffff" />
                                        ) : (
                                            <Play className="opacity-0 group-hover:opacity-100 w-4 h-4 text-[#ffffff] transition-opacity duration-200" fill="#ffffff" />
                                        )}
                                    </div>
                                </div>
                                <span className="text-[#000000] sm:text-sm text-base">{t('myVoice')}</span>
                                {isUsingCustom ? (
                                    <span className="bg-[#6D5EF3] ml-auto px-4 py-2 rounded-full font-medium text-[#ffffff] text-xs">Selected</span>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-[#111111] hover:bg-[#111111]/80 ml-auto px-4 py-2 border-0 rounded-full font-medium text-[#ffffff] hover:text-[#ffffff] text-xs"
                                        onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation()
                                            handleSwitchTTSPreference('custom')
                                        }}
                                    >
                                        <svg className="mr-1 w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17" fill="none">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M11.2553 1.57855C11.6109 1.48325 11.9765 1.69431 12.0718 2.04995L12.504 3.66317C12.6222 4.10417 12.3605 4.55746 11.9195 4.67562L10.3063 5.10788C9.95062 5.20318 9.58506 4.99212 9.48977 4.63648C9.39447 4.28084 9.60553 3.91528 9.96117 3.81998L10.1404 3.77196C7.73738 2.68046 4.85222 3.57196 3.50516 5.90513C2.76304 7.19052 2.63297 8.66021 3.02534 9.97994C3.13027 10.3329 2.92923 10.704 2.57631 10.809C2.22339 10.9139 1.85223 10.7128 1.7473 10.3599C1.25491 8.7038 1.41775 6.85396 2.35046 5.23846C4.07298 2.25497 7.79644 1.14698 10.8471 2.63092L10.7839 2.39504C10.6886 2.0394 10.8996 1.67384 11.2553 1.57855ZM5.15271 14.3691L5.21592 14.605C5.31121 14.9606 5.10016 15.3262 4.74451 15.4215C4.38887 15.5168 4.02331 15.3057 3.92802 14.9501L3.49576 13.3369C3.37759 12.8959 3.6393 12.4426 4.0803 12.3244L5.69352 11.8922C6.04916 11.7969 6.41472 12.0079 6.51001 12.3636C6.60531 12.7192 6.39425 13.0848 6.03861 13.1801L5.85939 13.2281C8.26241 14.3196 11.1476 13.4281 12.4946 11.0949C13.2367 9.80953 13.3668 8.33983 12.9744 7.0201C12.8695 6.66718 13.0705 6.29602 13.4235 6.19109C13.7764 6.08616 14.1476 6.2872 14.2525 6.64012C14.7449 8.29625 14.582 10.1461 13.6493 11.7616C11.9268 14.7451 8.20334 15.8531 5.15271 14.3691Z" fill="#ffffff"></path>
                                        </svg>
                                        Use
                                    </Button>
                                )}
                            </div>
                        </div>
                        {ttsSampleError && (
                            <div className="flex justify-center px-2">
                                <p className="text-red-500 text-sm text-center leading-relaxed">
                                    {ttsSampleError}
                                </p>
                            </div>
                        )}

                        {/* 更换自己的声音按钮：只有当有自定义语音且不在录音状态时才显示 */}
                        {recordState === 'idle' && (
                            <div className="flex justify-center mt-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-center shadow-none! focus-visible:shadow-none p-[8px] border-0! focus-visible:border-0 focus:border-0 border-none rounded-none outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full h-full sm:text-sm text-base transition-all duration-300 ease-in-out"
                                    onClick={handleChangeVoice}
                                >
                                    <span className="transition-all duration-300 ease-in-out">{t('changeOwnVoiceButton')}</span>
                                </Button>
                            </div>
                        )}
                    </>
                )}


                {/* 使用自己的声音：录音 + 上传（只有管理员且没有自定义语音时显示，或更换声音时显示） */}
                {user.id === ADMIN_USER_ID && (!hasCustomVoice || recordState !== 'idle') && (
                    <div className="space-y-2">
                        <div className="flex items-center h-10">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="justify-center shadow-none! focus-visible:shadow-none p-[8px] border-0! focus-visible:border-0 focus:border-0 border-none rounded-none outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full h-full sm:text-sm text-base transition-all duration-300 ease-in-out"
                                onClick={handleRecordButton}
                            >
                                <span className="mr-2 transition-all duration-300 ease-in-out">{renderRecordIcon()}</span>
                                <span className="transition-all duration-300 ease-in-out">{getRecordButtonText()}</span>
                            </Button>
                        </div>
                        {recordingError && (
                            <div className="flex justify-center px-2">
                                <p className="text-red-500 text-sm text-center leading-relaxed">
                                    {recordingError}
                                </p>
                            </div>
                        )}
                        {hasRecording() && (
                            <div className="flex justify-center">
                                <LoadingButton
                                    variant="default"
                                    isLoading={isUploading}
                                    isSuccess={uploadSuccess}
                                    successText={t('uploaded')}
                                    onClick={handleUploadVoiceClone}
                                    className="w-full"
                                >
                                    {t('uploadAndClone')}
                                </LoadingButton>
                            </div>
                        )}
                    </div>
                )}
            </>
        )
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Avatar className="bg-[#eaeceb] w-10 sm:w-10 h-10 sm:h-10 cursor-pointer">
                    <AvatarImage
                        src={avatarSrc}
                        alt="profile"
                    />
                    <AvatarFallback>user</AvatarFallback>
                </Avatar>
            </PopoverTrigger>
            <PopoverContent className="z-1002 space-y-1 p-3 sm:p-2 w-80 sm:w-72">
                {showTTSManager ? renderTTSContent() : renderDefaultContent()}
            </PopoverContent>
        </Popover>
    )
}