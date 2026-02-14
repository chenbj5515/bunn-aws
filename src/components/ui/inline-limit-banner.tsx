'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Lobster } from 'next/font/google';

const lobster = Lobster({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lobster',
});

interface InlineLimitBannerProps {
  className?: string;
  fontSizePx?: number;
  upgradeClassName?: string;
  textClassName?: string;
}

export function InlineLimitBanner({ className = '', fontSizePx, upgradeClassName, textClassName }: InlineLimitBannerProps) {
  const locale = useLocale();
  const t = useTranslations('common');

  const pricingHref = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.location.pathname.includes('/mobile');
    return `/${locale}${isMobile ? '/mobile' : ''}/pricing`;
  }, [locale]);

  const fontSizeStyle = fontSizePx ? { fontSize: `${fontSizePx}px` } : undefined;

  return (
    <div className={`mb-2 tracking-[.5px] ${className}`}>
      <span className={textClassName ?? "text-black"} style={fontSizeStyle}>
        {t.rich('limitReachedWithUpgrade', {
          upgrade: (chunks) => (
            <Link
              href={pricingHref}
              className={`${lobster.className} hover:opacity-80 underline ${upgradeClassName ?? ''}`}
              style={fontSizeStyle}
            >
              {chunks}
            </Link>
          ),
        })}
      </span>
    </div>
  );
}

export default InlineLimitBanner;


