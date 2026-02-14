"use client"
import * as React from "react"
import { Globe } from "lucide-react"
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

interface LanguageSelectorProps {
    showIcon?: boolean
    textClassName?: string
}

export function LanguageSelector({ showIcon = true, textClassName = '' }: LanguageSelectorProps) {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    const handleLanguageChange = async (value: string) => {
        // 获取当前路径并去除开头的语言代码部分
        const pathParts = pathname.split('/');
        // 移除第一个空字符串和语言代码
        pathParts.splice(0, 2);
        // 重新构建路径（不包含语言代码）
        const routeWithoutLocale = pathParts.join('/');

        router.push(`/${value}/${routeWithoutLocale}`);
        setIsOpen(false);
    }

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative text-black" ref={containerRef}>
            <div
                className="flex items-center space-x-1 cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                {showIcon && <Globe className="w-5 h-5" />}
                <span className={`font-medium text-black ${textClassName || 'sm:text-sm text-base'}`}>
                    {locale === 'zh' ? '简体中文' :
                        locale === 'zh-TW' ? '繁體中文' :
                            'English'}
                </span>
            </div>

            {isOpen && (
                <div className="right-0 z-50 absolute bg-white shadow-md mt-2 p-1 border rounded-md w-40">
                    <div
                        className={`px-4 py-2 text-sm text-black hover:bg-gray-100 rounded-sm cursor-pointer transition-colors duration-150 ${locale === 'en' ? 'bg-gray-100' : ''}`}
                        onClick={() => handleLanguageChange('en')}
                    >
                        English
                    </div>
                    <div
                        className={`px-4 py-2 text-sm text-black hover:bg-gray-100 rounded-sm cursor-pointer transition-colors duration-150 ${locale === 'zh' ? 'bg-gray-100' : ''}`}
                        onClick={() => handleLanguageChange('zh')}
                    >
                        简体中文
                    </div>
                </div>
            )}
        </div>
    )
}
