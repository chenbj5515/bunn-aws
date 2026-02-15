"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";

export default function LandingPage() {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const searchParams = useSearchParams();

  return (
    <div className="min-h-screen">
      {/* 自定义动画样式 */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>

      {/* Hero Section */}
      <div className="relative flex flex-col justify-center items-center mx-auto px-6 pt-28 pb-[64px] max-w-7xl min-h-[85vh] text-center">
        {/* Hero content */}
        <h1
          className={`${locale === "zh" ? "mb-12" : "mb-16"} font-bold text-[54px] leading-[1.3] tracking-tight max-w-5xl`}
        >
          {locale === "en" ? (
            <div className="space-y-6 font-[BlinkMacSystemFont] text-[48px]">
              Can I really <span className="opacity-[0.2]">learn Japanese</span>{" "}
              by watching anime?
              <div className="mt-8">
                Definitely you can.{" "}
                <span className="opacity-[0.2]">With Bunn.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6 font-[BlinkMacSystemFont] text-[48px]">
              {t("home.personalJourney")}
              <div className="mt-8">{t("home.personalJourneySubtitle")}</div>
            </div>
          )}
        </h1>
        <Link href="/login" className="flex flex-col gap-4 mt-6">
          <button
            type="button"
            className="group inline-flex relative items-center gap-2 bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:shadow-[0px_0px_0px_rgba(0,0,0,0)] px-10 py-4 border-2 border-black rounded-full h-[62px] font-medium text-[22px] text-black transition-all translate-x-0 translate-y-0 hover:translate-x-2 hover:translate-y-2 duration-200 transform"
          >
            <span>{t("home.getStartedFree")}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-5 h-5 transition-transform group-hover:translate-x-1 duration-200 transform"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 12h13m0 0L13 6m5 6l-5 6"
              />
            </svg>
          </button>
        </Link>

        {/* Ctrl ctrl */}
        <div className="flex flex-col items-center mt-32">
          <div className="mb-8 font-sans text-center">
            <h3 className="mb-2 font-bold text-[#0034df] text-[3.25rem]">
              {t("home.landingPage.ctrlSection.title")}
            </h3>
            <h3
              className={`my-6 text-[24px] text-2xl whitespace-pre-line leading-12 ${locale === "en" ? "tracking-[-0.5px]" : ""}`}
            >
              {t("home.landingPage.ctrlSection.subtitle")}
            </h3>
          </div>
        </div>

        {/* Anime TV Image */}
        <div className="flex flex-col items-center mt-4">
          <div className="relative w-[1080px]">
            <div className="flex justify-center">
              <Image
                src="/images/tv.png"
                alt="Anime-based learning illustration"
                width={1080}
                height={582}
                className="rounded-lg object-contain cursor-pointer"
                onClick={() => router.push(`/${locale}/login`)}
              />
            </div>
          </div>
        </div>

        {/* 可理解输入 */}
        <div className="flex flex-col items-center mt-24">
          <div className="mb-8 font-sans text-center">
            <h3 className="mb-2 font-bold text-[#ea4c89] text-[3.25rem]">
              {t("home.landingPage.comprehensibleInput.title")}
            </h3>
            <h3 className="my-6 text-[24px] text-2xl leading-12 tracking-[-0.5px]">
              {t("home.landingPage.comprehensibleInput.description")}
            </h3>
          </div>
          <div className="relative mt-4 w-[1080px]">
            <div className="flex justify-center">
              <Image
                src="/images/memo-card.png"
                alt="Memo card illustration"
                width={1080}
                height={582}
                className="rounded-lg object-contain cursor-pointer"
                onClick={() => router.push(`/${locale}/login`)}
              />
            </div>
          </div>
        </div>

        {/* 影子阅读 */}
        <div className="flex flex-col items-center mt-24">
          <div className="mb-8 font-sans text-center">
            <h3 className="mb-2 font-bold text-[#ffbe18] text-[3.25rem]">
              {t("home.landingPage.shadowReading.title")}
            </h3>
            <h3
              className={`my-8 text-[24px] text-2xl tracking-[-0.5px] whitespace-pre-line leading-12`}
            >
              {t("home.landingPage.shadowReading.description")}
            </h3>
          </div>
          <div className="relative mt-4 w-[1080px]">
            <div className="flex justify-center">
              <Image
                src="/images/review.png"
                alt="Painless repetition"
                width={1080}
                height={582}
                className="rounded-lg object-contain cursor-pointer"
                onClick={() => router.push(`/${locale}/login`)}
              />
            </div>
          </div>
        </div>

        {/* 不是一个应用而是一种链接 */}
        <div className="flex flex-col items-center mt-24">
          <div className="mb-8 font-sans text-center">
            <h3 className="mb-2 font-bold text-[#00C853] text-[3.25rem]">
              {t("home.landingPage.linkSection.title")}
            </h3>
            <h3
              className={`my-8 text-[24px] text-2xl tracking-[-0.5px] whitespace-pre-line leading-12`}
            >
              {t("home.landingPage.linkSection.subtitle")}
            </h3>
          </div>
          <div className="relative mt-4 w-[1080px]">
            <div className="flex justify-center">
              <Image
                src="/images/osusume.png"
                alt="Not an app, but a connection"
                width={1080}
                height={582}
                className="rounded-lg object-contain cursor-pointer"
                onClick={() => router.push(`/${locale}/login`)}
              />
            </div>
          </div>
        </div>

        {/* Try Bunn now! 按钮 */}
        <div className="flex justify-center mt-32">
          <button
            type="button"
            className="group inline-flex items-center gap-2 bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:shadow-[0px_0px_0px_rgba(0,0,0,0)] px-10 py-4 border-2 border-black rounded-full font-medium text-[22px] text-black transition-all translate-x-0 translate-y-0 hover:translate-x-2 hover:translate-y-2 duration-200 transform"
            onClick={() => router.push(`/${locale}/login`)}
          >
            <span>{t("home.tryBunnNow")}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-5 h-5 transition-transform group-hover:translate-x-1 duration-200 transform"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 12h13m0 0L13 6m5 6l-5 6"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
