"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSelector } from "@/components/user-panel/language-selector";

interface LandingHeaderProps {
  isLoggedIn: boolean;
  userImage?: string | null;
}

export function LandingHeader({ isLoggedIn, userImage }: LandingHeaderProps) {
  const t = useTranslations();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`font-sans fixed top-[20px] left-1/2 -translate-x-1/2 w-[80%] h-[64px] z-11 rounded-lg transition-all duration-200 ${
        isScrolled
          ? "bg-white border-b border-[#eaeaea] shadow-sm"
          : ""
      }`}
    >
      <div className="relative flex justify-between items-center mx-auto px-[40px] h-full container">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <Image
              src="/images/logo.jpeg"
              alt="Bunn"
              width={32}
              height={32}
              className="rounded-[6px] w-[32px] h-[32px]"
            />
            <span className="font-semibold text-[18px] text-black">Bunn</span>
          </Link>
        </div>

        {/* 中央导航链接 - 绝对定位居中 */}
        <div className="top-1/2 left-1/2 absolute -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-12">
            <Link
              href="/guide"
              className="font-medium text-[16px] text-black hover:text-[#595a5d] transition-colors"
            >
              {t("common.guide")}
            </Link>
            <Link
              href="/pricing"
              className="font-medium text-[16px] text-black hover:text-[#595a5d] transition-colors"
            >
              {t("common.pricing")}
            </Link>
            <a
              href="https://t.me/+Q5bP1Kok5jpmYzhl"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[16px] text-black hover:text-[#595a5d] transition-colors"
            >
              {t("common.contact")}
            </a>
          </div>
        </div>

        {/* 右侧：登录按钮或头像 + 语言选择器 */}
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <Link href="/channels">
              <Avatar className="bg-[#eaeceb] w-10 h-10 cursor-pointer">
                <AvatarImage src={userImage || undefined} alt="profile" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 border border-gray-300 hover:border-black rounded-[8px] font-medium text-[14px] text-black hover:text-[#595a5d] transition"
            >
              SIGN IN
            </Link>
          )}
          <LanguageSelector />
        </div>
      </div>
    </nav>
  );
}
