import { useRef, useEffect } from 'react';

// 监听连续两次按下v键的事件，触发回调函数
export function useDoubleVKeyPress(callback: () => void) {
    const pressCountRef = useRef(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const resetPressCount = () => {
        pressCountRef.current = 0;
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === 'v') {
            pressCountRef.current += 1;

            if (pressCountRef.current === 2) {
                callback();
                resetPressCount();
            } else {
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                }
                timerRef.current = setTimeout(resetPressCount, 1000); // 1秒内必须按下两次v键
            }
        }
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);

        return () => {
            document.removeEventListener('keydown', handleKeyPress);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [handleKeyPress]);
}

// 监听option/alt键的事件，触发回调函数
export function useOptionKeyPress(callback: () => void) {
    const handleKeyPress = (event: KeyboardEvent) => {
        // 检测Alt键（在Mac上是Option键）
        if (event.altKey) {
            callback();
        }
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);

        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [handleKeyPress]);
}

export function useCtrlKeyPress(callback: () => void) {
    const handleKeyPress = (event: KeyboardEvent) => {
        // 检测Alt键（在Mac上是Option键）
        if (event.ctrlKey) {
            callback();
        }
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);

        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [handleKeyPress]);
}