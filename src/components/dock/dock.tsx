"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { AppIcon } from "./app-icon"
import { useRouter, usePathname } from "next/navigation"
import { useParams } from "next/navigation"
import { useTranslations } from 'next-intl'
import { LucideIcon } from 'lucide-react'

// 定义应用图标数据接口
interface AppIconData {
    name: string;
    icon?: string;
    iconComponent?: LucideIcon;
    onClick: () => void;
    tooltip?: string;
    backgroundColor?: string;
}

export function Dock() {
    const router = useRouter()
    const params = useParams()
    const pathname = usePathname()
    const locale = params.locale || "zh"
    const t = useTranslations('components.dock')

    // 检查当前是否在word-cards路由
    const isWordCardsRoute = pathname?.includes('/word-cards')

    // 初始化 isDockVisible 状态：如果不在word-cards路由且DEBUG_MODE为true，则默认可见
    const [isDockVisible, setIsDockVisible] = useState(true)
    const [hoveredIcon, setHoveredIcon] = useState<number | null>(null)

    const appIcons: AppIconData[] = [
        {
            name: "Card",
            icon: "/icon/card.png",
            onClick: () => router.push(`/${locale}/daily-task`),
            tooltip: t('dailyTasks')
        },
        {
            name: "YouTube",
            icon: "/icon/youtube.png",
            onClick: () => router.push(`/${locale}/channels`),
            tooltip: t('youtube')
        },
        {
            name: "Safari",
            icon: "/assets/red.png",
            onClick: () => router.push(`/${locale}/safari`),
            tooltip: t('safari')
        },
        // {
        //     name: "Netflix",
        //     icon: "/icon/netflix-n.png",
        //     onClick: () => router.push(`/${locale}/series-list/netflix`),
        //     tooltip: t('netflix')
        // },
        // {
        //     name: "Book",
        //     iconComponent: Book,
        //     onClick: () => router.push(`/${locale}/books`),
        //     tooltip: t('books')
        // },
        // {
        //     name: "Others",
        //     icon: "/icon/ohters.png",
        //     onClick: () => router.push(`/${locale}/others`),
        //     tooltip: t('others')
        // },
    ]

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // 当鼠标在距离左边界70px范围内时显示Dock
            if (e.clientX <= 70) {
                setIsDockVisible(true)
            } else {
                setIsDockVisible(false)
            }
        }

        // 添加鼠标移动事件监听
        document.addEventListener('mousemove', handleMouseMove)

        // 清理事件监听
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
        }
    }, [])

    return (
        <div className="top-1/2 left-0 z-100 fixed flex -translate-y-1/2 cursor-pointer">
            <motion.div
                className="flex flex-col justify-center items-center bg-[#0000000d] backdrop-blur-md backdrop-saturate-180 px-2 pt-2 pb-4 border-[0.5px] border-white/20 rounded-2xl"
                initial={{ opacity: 0, x: -100 }}
                animate={{
                    opacity: isDockVisible ? 1 : 0,
                    x: isDockVisible ? 0 : -100
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            >
                <div className="flex flex-col items-center gap-[14px] pt-4">
                    {appIcons.map((app, index) => (
                        <AppIcon
                            key={app.name}
                            name={app.name}
                            icon={app.icon}
                            isHovered={hoveredIcon === index}
                            onHover={() => setHoveredIcon(index)}
                            onLeave={() => setHoveredIcon(null)}
                            onClick={app.onClick}
                            tooltip={app.tooltip}
                            backgroundColor={app.backgroundColor}
                            iconComponent={app.iconComponent} // 传递 iconComponent
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    )
}