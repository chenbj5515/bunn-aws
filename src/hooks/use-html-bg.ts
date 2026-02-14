import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useHtmlBg(): void {
    const pathname = usePathname();
    const unloginHeaderPaths = ["blog", "home", "guide", "pricing", "privacy-policy", "terms-of-service", "business-disclosure"];
    const shouldAddBgClass = unloginHeaderPaths.some(path => pathname.includes(path));

    useEffect(() => {
        // 获取HTML、body和main元素
        const htmlElement = document.documentElement;
        const bodyElement = document.body;
        const mainElement = document.querySelector('main');

        // 背景色类名
        const bgClassName = 'bg-[#f5f5f5]';
        
        // 检查是否有指定的背景色类名
        const htmlHasBgClass = htmlElement.classList.contains(bgClassName);
        const bodyHasBgClass = bodyElement.classList.contains(bgClassName);
        const mainHasBgClass = mainElement?.classList.contains(bgClassName);

        if (shouldAddBgClass) {
            // 如果是unloginHeaderPaths中的路由，且没有背景类，则添加
            if (!htmlHasBgClass) {
                htmlElement.classList.add(bgClassName);
            }
            if (!bodyHasBgClass) {
                bodyElement.classList.add(bgClassName);
            }
            if (!mainHasBgClass && mainElement) {
                mainElement.classList.add(bgClassName);
            }
        } else {
            // 如果不是unloginHeaderPaths中的路由，且有背景类，则删除
            if (htmlHasBgClass) {
                htmlElement.classList.remove(bgClassName);
            }
            if (bodyHasBgClass) {
                bodyElement.classList.remove(bgClassName);
            }
            if (mainHasBgClass && mainElement) {
                mainElement.classList.remove(bgClassName);
            }
        }

        return () => {
        };
    }, [pathname]); // 依赖于路由和其他状态
}