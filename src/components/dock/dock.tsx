"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { AppIcon } from "./app-icon"
import { useRouter } from "next/navigation"
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

interface DockProps {
    isLoggedIn?: boolean;
}

export function Dock({ isLoggedIn = false }: DockProps) {
    // 未登录时不显示 Dock
    if (!isLoggedIn) {
        return null;
    }
    const router = useRouter()
    const params = useParams()
    const locale = params.locale || "zh"
    const t = useTranslations('components.dock')

    const [hoveredIcon, setHoveredIcon] = useState<number | null>(null)

    const appIcons: AppIconData[] = [
        {
            name: "Card",
            icon: "/images/card.png",
            onClick: () => router.push(`/${locale}/daily-task`),
            tooltip: t('dailyTasks')
        },
        {
            name: "YouTube",
            icon: "/images/youtube.png",
            onClick: () => router.push(`/${locale}/channels`),
            tooltip: t('youtube')
        },
        {
            name: "Safari",
            icon: "/images/red.png",
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

    return (
        <div className="top-1/2 left-0 z-100 fixed flex -translate-y-1/2 cursor-pointer">
            <motion.div
                className="flex flex-col justify-center items-center bg-[#0000000d] backdrop-blur-md backdrop-saturate-180 px-2 pt-2 pb-4 border-[0.5px] border-white/20 rounded-2xl"
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
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