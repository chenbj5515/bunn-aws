"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

export default function GuidePage() {
  const t = useTranslations("guide");
  const searchParams = useSearchParams();

  useEffect(() => {
    const scrollY = searchParams.get("scroll");
    if (scrollY) {
      window.scrollTo({
        top: parseInt(scrollY),
        behavior: "smooth",
      });
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen text-[18px] leading-[1.9] tracking-[0.4px]">
      <div className="mx-auto pt-[120px] px-8 max-w-[1440px]">
        {/* Hero Section */}
        <div className="mb-4 text-center">
          <h1 className="mb-4 font-bold text-4xl">{t("title")}</h1>
          <p className="text-black text-lg">{t("subtitle")}</p>
        </div>

        {/* Preface Section */}
        <div className="shadow-none border-none">
          <h2 className="m-12 font-semibold text-2xl text-center">
            {t("preface.title")}
          </h2>
          <div className="mx-auto max-w-3xl">
            <p className="mb-8 text-black text-lg leading-relaxed">
              {t("preface.challenge")}
            </p>
            <p className="mb-8 text-black text-lg leading-relaxed">
              {t("preface.aiEra")}
            </p>
            <p className="mb-8 text-black text-lg leading-relaxed">
              {t("preface.bestProcess")}
            </p>
            <ul className="space-y-3 mb-8 pl-4 text-black">
              {(t.raw("preface.principles") as string[]).map(
                (principle: string, index: number) => (
                  <li key={index} className="list-disc">
                    {principle}
                  </li>
                )
              )}
            </ul>
            <p className="mb-8 text-black text-lg leading-relaxed">
              {t("preface.creation")}
            </p>
          </div>
        </div>

        {/* Core Concept Section */}
        <div className="shadow-none border-none">
          <h2 className="m-12 font-semibold text-2xl text-center text-black">
            {t("core.title")}
          </h2>
          <div className="mx-auto max-w-3xl">
            <p className="mb-8 text-black text-lg leading-relaxed">
              {t("core.origin")}
            </p>
            <p className="mb-8 text-black text-lg leading-relaxed">
              {t("core.features")}
            </p>
            <p className="mb-8 text-black text-lg leading-relaxed">
              {t("core.inputMethods")}
            </p>
            <div className="mb-8 flex justify-center">
              <Image
                src="/images/subtitle-capture.png"
                alt="字幕录入演示"
                width={600}
                height={400}
                className="rounded-lg shadow-lg"
              />
            </div>
            <div className="mt-14 text-[16px]"></div>
          </div>
        </div>

        {/* Review Section */}
        <div className="shadow-none border-none">
          <h2 className="m-12 font-semibold text-2xl text-center">
            {t("review.title")}
          </h2>
          <div className="mx-auto max-w-3xl">
            <p className="mb-8 text-black text-lg leading-relaxed">
              {t("review.description")}
            </p>
            <p className="mb-8 text-black text-lg leading-relaxed">
              {t("review.reason")}
            </p>
            <p className="mb-8 text-black text-lg leading-relaxed">
              {t("review.solution")}
            </p>
            <p className="mb-8 text-black text-lg leading-relaxed">
              {t("review.interaction")}
            </p>
          </div>
        </div>

        {/* Context Section */}
        <div className="shadow-none border-none">
          <h2 className="m-12 font-semibold text-2xl text-center">
            {t("context.title")}
          </h2>
          <div className="mx-auto max-w-3xl">
            <p className="mb-6 text-black">{t("context.intro")}</p>
            <p className="mb-6 text-black">{t("context.importance")}</p>
            <p className="text-black">{t("context.feature")}</p>
            <div className="mt-8 mb-8 flex justify-center">
              <Image
                src="/images/context-restore.png"
                alt="上下文恢复演示"
                width={600}
                height={400}
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="shadow-none border-none">
          <h2 className="m-12 font-semibold text-2xl text-center">
            {t("why.title")}
          </h2>
          <div className="mx-auto max-w-3xl">
            <div className="space-y-6 text-black">
              <div className="mb-8">
                <h3 className="mb-3 font-medium text-xl">
                  {t("why.sections.built.title")}
                </h3>
                <p className="leading-relaxed">
                  {t("why.sections.built.description")}
                </p>
              </div>

              <div className="mb-8">
                <h3 className="mb-3 font-medium text-xl">
                  {t("why.sections.serious.title")}
                </h3>
                <p className="leading-relaxed">
                  {t("why.sections.serious.description")}
                </p>
              </div>

              <div className="mb-8">
                <h3 className="mb-3 font-medium text-xl">
                  {t("why.sections.workflow.title")}
                </h3>
                <p className="leading-relaxed">
                  {t("why.sections.workflow.description")}
                </p>
              </div>
            </div>
            <div className="mx-auto mt-4 max-w-3xl">
              {t.rich("why.explore", {
                link: (chunks) => (
                  <a
                    href="https://japanese-memory-rsc.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 hover:underline"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
