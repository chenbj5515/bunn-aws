"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function LandingFooter() {
  const t = useTranslations("common.footer");

  return (
    <footer className="mt-auto py-8 w-full">
      {/* 底部链接 */}
      <div className="flex justify-center items-center space-x-6">
        <p>{t("copyright")}</p>
        <span>•</span>
        <Link href="/terms-of-service" className="hover:opacity-70">
          {t("termsOfService")}
        </Link>
        <Link href="/privacy-policy" className="hover:opacity-70">
          {t("privacyPolicy")}
        </Link>
      </div>
    </footer>
  );
}
