import type { MotionProps } from 'framer-motion';

// 动画持续时间配置
export const ANIMATION_DURATIONS = {
    // 进度条动画
    PROGRESS_BAR_ENTRY_EXIT: 0.5,
    PROGRESS_BAR_LIQUID_FLOW: 0.7,

    // 视频区域动画
    VIDEO_SWITCH: 0.5,
    VIDEO_FADE: 0.3,

    // 滚动切换动画
    SCROLL_SWITCH_EXIT: 0.24,
    SCROLL_SWITCH_ENTER: 0.36,

    // 初始状态过渡动画
    INITIAL_TRANSITION: 0.4,
    INITIAL_CONTENT_FADE: 0.3,

    // Typing动画
    TYPING_CHARACTER: 80, // 毫秒

    // 弹窗动画
    DIALOG_FADE: 0.2,

    // 句子构建动画
    SENTENCE_BUILDING_HOVER: 0.2,
    SENTENCE_BUILDING_TRANSFORM: 0.3,
    SENTENCE_BUILDING_BUTTON: 0.6,

    // 结算体验动画
    SETTLEMENT_OVERLAY: 0.35,
    SETTLEMENT_PANEL: 0.45,
    SETTLEMENT_VIDEO: 0.5,
    SETTLEMENT_CONTENT: 0.55,
} as const;

// 缓动函数配置
export const EASING_FUNCTIONS = {
    EASE_IN_OUT: 'easeInOut',
    EASE_OUT: 'easeOut',
    EASE_IN: 'easeIn',
    // 滚动切换专用缓动 - 更灵动的贝塞尔曲线
    SCROLL_SWITCH: [0.22, 1, 0.36, 1],
    // 滚动切换退出专用 - 更平滑的easeOut
    SCROLL_SWITCH_EXIT: [0.33, 0.99, 0.53, 1],
} as const;

// Spring配置
export const SPRING_CONFIGS = {
    VIDEO_SWITCH: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30
    },
} as const;

// 进度条动画变体
export const PROGRESS_BAR_VARIANTS = {
    initial: {
        opacity: 0,
        y: -20
    },
    animate: {
        opacity: 1,
        y: 0
    },
    exit: {
        opacity: 0,
        y: -30,
        scale: 0.98
    }
};

// 进度条过渡配置
export const PROGRESS_BAR_TRANSITION = {
    duration: ANIMATION_DURATIONS.PROGRESS_BAR_ENTRY_EXIT,
    ease: EASING_FUNCTIONS.EASE_IN_OUT
};

// 视频区域动画变体
export const VIDEO_AREA_VARIANTS = {
    // 向上切换
    initialUp: {
        opacity: 0,
        y: 100,
        scale: 0.9
    },
    // 向下切换
    initialDown: {
        opacity: 0,
        y: -100,
        scale: 0.9
    },
    // 默认进入
    initialDefault: {
        opacity: 0,
        scale: 0.96
    },
    // 动画状态
    animate: {
        opacity: 1,
        y: 0,
        scale: 1
    },
    // 向上退出
    exitUp: {
        opacity: 0,
        y: -100,
        scale: 0.9
    },
    // 向下退出
    exitDown: {
        opacity: 0,
        y: 100,
        scale: 0.9
    },
    // 默认退出
    exitDefault: {
        opacity: 0,
        scale: 0.9
    }
} as const;

// 视频区域过渡配置
export const VIDEO_AREA_TRANSITION = {
    duration: ANIMATION_DURATIONS.VIDEO_SWITCH,
    ease: EASING_FUNCTIONS.EASE_IN_OUT,
    y: SPRING_CONFIGS.VIDEO_SWITCH
};

// 初始状态过渡动画类名
export const INITIAL_TRANSITION_CLASSES = {
    container: `transition-all duration-${ANIMATION_DURATIONS.INITIAL_TRANSITION * 1000} ${EASING_FUNCTIONS.EASE_OUT}`,
    content: `transition-all duration-${ANIMATION_DURATIONS.INITIAL_CONTENT_FADE * 1000} ${EASING_FUNCTIONS.EASE_OUT}`
};

// CSS动画类名配置
export const CSS_ANIMATION_CLASSES = {
    SLIDE_IN_FROM_TOP: 'animate-slideInFromTop',
    SLIDE_IN_BOTTOM: 'animate-slideInBottom',
    LIQUID_FLOW: 'animate-liquidFlow',
    SHIMMER: 'animate-shimmer',
    FADE_IN_UP: 'animate-fadeInUp',
    PULSE: 'animate-pulse'
} as const;

// 合成层优化样式配置（用于滚动切换动画）
export const COMPOSITING_LAYER_STYLES = {
    // GPU合成层优化
    SCROLL_SWITCH_CONTAINER: 'will-change-transform transform translateZ(0) backface-visibility-hidden contain-paint',
    // 滚动切换专用容器样式
    SCROLL_SWITCH_WRAPPER: 'relative overflow-visible',
} as const;

// 动画状态类名生成器
export const getTransitionClasses = (duration: number, easing: string) => {
    return `transition-all duration-${duration * 1000} ${easing}`;
};

// 句子构建组件专用动画类名生成器
export const getSentenceBuildingAnimationClasses = () => {
    const hoverClasses = `hover:scale-110 hover:shadow-xl active:scale-95 shadow-blue-200 transition-all duration-${ANIMATION_DURATIONS.SENTENCE_BUILDING_HOVER * 1000}`;
    const transformClasses = `transition-transform translate-y-0.5 group-active:translate-y-1 group-hover:translate-y-1 duration-${ANIMATION_DURATIONS.SENTENCE_BUILDING_BUTTON * 1000} will-change-transform`;
    const buttonTransformClasses = `transition-transform -translate-y-1 group-active:-translate-y-0.5 group-hover:-translate-y-1.5 duration-${ANIMATION_DURATIONS.SENTENCE_BUILDING_BUTTON * 1000} will-change-transform`;

    return {
        hoverClasses,
        transformClasses,
        buttonTransformClasses
    };
};

// 视频区域动画配置生成器 - 直接返回 motion props
export const getVideoAreaMotionProps = () => {
    return {
        initial: VIDEO_AREA_VARIANTS.initialDefault as any,
        animate: VIDEO_AREA_VARIANTS.animate as any,
        exit: VIDEO_AREA_VARIANTS.exitDefault as any,
        transition: VIDEO_AREA_TRANSITION
    };
};

// 进度条动画配置生成器
export const getProgressBarMotionProps = () => ({
    initial: PROGRESS_BAR_VARIANTS.initial as any,
    animate: PROGRESS_BAR_VARIANTS.animate as any,
    exit: PROGRESS_BAR_VARIANTS.exit as any,
    transition: PROGRESS_BAR_TRANSITION
});

// 滚动切换动画变体
export const SCROLL_SWITCH_VARIANTS = {
    // 初始状态
    initial: {
        y: 0
    },
    // 出场动画 - 向上移动
    exitUp: {
        y: '-100%'
    },
    // 入场动画 - 从下方进入
    enterFromBottom: {
        y: 0
    },
    // 底部起点位置（无动画瞬时设置）
    bottomStart: {
        y: '100%'
    }
} as const;

// 滚动切换过渡配置
export const SCROLL_SWITCH_TRANSITIONS = {
    exit: {
        duration: ANIMATION_DURATIONS.SCROLL_SWITCH_EXIT,
        ease: EASING_FUNCTIONS.SCROLL_SWITCH_EXIT
    },
    enter: {
        duration: ANIMATION_DURATIONS.SCROLL_SWITCH_ENTER,
        ease: EASING_FUNCTIONS.SCROLL_SWITCH
    }
} as const;

// 滚动切换动画控制器生成器
export const getScrollSwitchMotionProps = () => ({
    initial: SCROLL_SWITCH_VARIANTS.initial as any,
    transition: SCROLL_SWITCH_TRANSITIONS.exit
});

// 结算体验动画配置
export const SETTLEMENT_EXPERIENCE_MOTION: {
    overlay: MotionProps;
    panel: MotionProps;
    video: MotionProps;
    content: MotionProps;
} = {
    overlay: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: {
            duration: ANIMATION_DURATIONS.SETTLEMENT_OVERLAY,
            ease: EASING_FUNCTIONS.EASE_OUT,
        },
    },
    panel: {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        transition: {
            duration: ANIMATION_DURATIONS.SETTLEMENT_PANEL,
            ease: EASING_FUNCTIONS.EASE_OUT,
            delay: 0.08,
        },
    },
    video: {
        initial: { opacity: 0, y: 28 },
        animate: { opacity: 1, y: 0 },
        transition: {
            duration: ANIMATION_DURATIONS.SETTLEMENT_VIDEO,
            ease: EASING_FUNCTIONS.EASE_OUT,
            delay: 0.16,
        },
    },
    content: {
        initial: { opacity: 0, y: 32 },
        animate: { opacity: 1, y: 0 },
        transition: {
            duration: ANIMATION_DURATIONS.SETTLEMENT_CONTENT,
            ease: EASING_FUNCTIONS.EASE_OUT,
            delay: 0.22,
        },
    },
};
