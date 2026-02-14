"use client";

import { useTranslations } from "next-intl";
import { TypingAnimation } from "@/components/ui/typing-animation";
import CtaButton from "@/components/ui/cta-button";
import {
    CSS_ANIMATION_CLASSES,
    ANIMATION_DURATIONS,
} from "@/animation";

interface StartTaskViewProps {
    onStart: () => void;
}

export function StartTaskView({ onStart }: StartTaskViewProps) {
    const tDaily = useTranslations("dailyTask");

    return (
        <div className="flex justify-center items-center bg-gray-50 w-full h-full">
            <div className="space-y-8 -mt-16 text-center">
                <TypingAnimation
                    startOnView={true}
                    className="font-bold text-black text-5xl"
                    duration={ANIMATION_DURATIONS.TYPING_CHARACTER}
                >
                    {tDaily("startPrompt")}
                </TypingAnimation>
                <div className={`flex justify-center opacity-0 mt-[22px] ${CSS_ANIMATION_CLASSES.FADE_IN_UP}`}>
                    <CtaButton
                        text={tDaily("letsGo")}
                        baseColor="#16a34a"
                        onClick={onStart}
                    />
                </div>
            </div>
        </div>
    );
}
