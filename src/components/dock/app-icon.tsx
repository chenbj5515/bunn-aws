"use client"

import { motion, AnimatePresence } from "framer-motion"
import Loading from "@/components/ui/loading"
import { localCardAtom } from '@/lib/atom';
import { useAtom } from 'jotai';
import { useEffect, useState } from "react";
import { LucideIcon } from 'lucide-react';

interface AppIconProps {
    name: string
    icon?: string
    iconComponent?: LucideIcon
    isHovered: boolean
    onHover: () => void
    onLeave: () => void
    onClick?: () => void
    tooltip?: string
    backgroundColor?: string
}

export function AppIcon({ name, icon, iconComponent: IconComponent, isHovered, onHover, onLeave, onClick, tooltip, backgroundColor }: AppIconProps) {
    const [localCard] = useAtom(localCardAtom);
    const [animationKey, setAnimationKey] = useState(0);

    // 判断当前应用是否应该显示状态动画
    const isActiveApp = localCard.activeApp === name || 
        (localCard.activeApp === null && name === "Others");

    // 监听localCard.state变化，当状态变为'added'时重置动画
    useEffect(() => {
        if (localCard.state === 'added') {
            setAnimationKey(prev => prev + 1);
        }
    }, [localCard.state]);

    return (
        <motion.div
            className="relative flex justify-center items-center"
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            onClick={onClick}
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
            <motion.div
                className="relative flex justify-center items-center shadow-md rounded-lg w-12 h-12"
                style={{ backgroundColor: backgroundColor || "white" }}
                animate={{
                    scale: isHovered ? 1.2 : 1,
                    y: isHovered ? -5 : 0,
                }}
                transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 17,
                }}
            >
                {(!isActiveApp || (!localCard.state || localCard.state === 'idle')) ? (
                    <div className="flex justify-center items-center rounded-lg w-10 h-10 overflow-hidden">
                        {IconComponent ? (
                            <IconComponent className="w-6 h-6 text-gray-700" />
                        ) : (
                            <img
                                src={icon}
                                alt={name}
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {localCard.state === 'adding' && (
                            <motion.div 
                                key="loading" 
                                className="scale-50"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 0.5 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Loading />
                            </motion.div>
                        )}
                        
                        {localCard.state === 'added' && (
                            <motion.div 
                                key="added" 
                                className="relative"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.3 }}
                            >
                                <svg
                                    key={animationKey}
                                    className="overflow-visible"
                                    viewBox="0 0 64 64"
                                    height="24px"
                                    width="24px"
                                >
                                    <path
                                        d="M 14 32 L 28 46 L 50 18"
                                        pathLength="100"
                                        stroke="green"
                                        style={{
                                            fill: "none",
                                            strokeWidth: 6,
                                            strokeLinecap: "round",
                                            strokeLinejoin: "round",
                                            animation: "checkmark 0.5s ease forwards",
                                        }}
                                    ></path>
                                </svg>
                                <style jsx>{`
                                    @keyframes checkmark {
                                        0% {
                                            stroke-dasharray: 0 100;
                                            stroke-dashoffset: 0;
                                        }
                                        100% {
                                            stroke-dasharray: 100 100;
                                            stroke-dashoffset: 0;
                                        }
                                    }
                                `}</style>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </motion.div>

            {isHovered && tooltip && (
                <motion.div
                    className="left-16 z-50 absolute min-w-[300px]"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                    <div className="relative bg-white shadow-md px-6 py-3 rounded-[12px] w-[160px] text-[14px] text-black">
                        {tooltip}
                        <div className="top-1/2 left-[-7px] z-20 absolute bg-white shadow-[-2px_2px_3px_-1px_rgba(0,0,0,0.05)] w-5 h-5 rotate-45 -translate-y-1/2 transform"></div>
                    </div>
                </motion.div>
            )}

            {/* <motion.div
                className="bottom-0 absolute bg-white rounded-full w-1 h-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
            /> */}
        </motion.div>
    )
}