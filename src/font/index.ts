import { Lobster, Inter } from 'next/font/google';

// 配置Lobster字体
export const lobster = Lobster({
    weight: '400',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-lobster',
});

// 配置Inter字体
export const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
});