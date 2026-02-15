import type React from "react";
import { Check, X } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UpgradeButton } from "./_components/upgrade-button";
import { getSession } from "@/lib/auth";
import { getUserSettings } from "@/lib/auth/helpers";

const FeatureItem = ({
  children,
  included = false,
}: {
  children: React.ReactNode;
  included?: boolean;
}) => (
  <li className="flex items-center">
    {included ? (
      <Check className="mr-2 w-4 h-4 text-primary" />
    ) : (
      <X className="mr-2 w-4 h-4 text-gray-300" />
    )}
    <span className={included ? "" : "text-gray-400"}>{children}</span>
  </li>
);

export default async function SubscriptionPage() {
  const t = await getTranslations("pricing");
  const locale = await getLocale();
  const isChineseLocale = locale === "zh";

  // 获取用户会话和订阅状态
  const session = await getSession();
  const isLoggedIn = !!session?.user?.id;

  // 获取用户订阅状态
  let isPaidUser = false;
  if (isLoggedIn) {
    const userSettings = await getUserSettings(session.user.id);
    isPaidUser = userSettings.subscription.active;
  }

  return (
    <div className="flex justify-center items-center mx-auto min-h-[calc(100vh-80px)] container">
      <div className="gap-20 grid md:grid-cols-2 mx-auto max-w-[700px]">
        <Card className="hover:border-primary w-[324px] h-[400px] transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-[20px]">{t("freePlan.title")}</CardTitle>
            <CardDescription>{t("freePlan.description")}</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[180px]">
            <p className="mb-4 font-bold text-3xl">{t("freePlan.price")}</p>
            <ul className="space-y-2">
              <FeatureItem included>{t("freePlan.features.tokens")}</FeatureItem>
              <FeatureItem included>{t("freePlan.features.images")}</FeatureItem>
              <FeatureItem included>{t("freePlan.features.tts")}</FeatureItem>
            </ul>
          </CardContent>
          <CardFooter>
            {/* 仅在用户未登录或未付费时显示"当前方案"按钮 */}
            {(!isLoggedIn || !isPaidUser) && (
              <Button className="mt-[30px] w-full h-[42px]" variant="outline">
                {t("freePlan.currentPlan")}
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="hover:border-primary w-[324px] h-[400px] transition-all duration-300">
          <CardHeader>
            <CardTitle className="font-NewYork text-[20px]">
              {t("proPlan.title")}
            </CardTitle>
            <CardDescription>{t("proPlan.description")}</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[180px]">
            <p className="mb-4 font-NewYork font-bold text-3xl">
              {t("proPlan.price")}
            </p>
            <ul className="space-y-2">
              <FeatureItem included>{t("proPlan.features.tokens")}</FeatureItem>
              <FeatureItem included>{t("proPlan.features.images")}</FeatureItem>
              <FeatureItem included>{t("proPlan.features.tts")}</FeatureItem>
            </ul>
          </CardContent>
          <CardFooter className="relative flex flex-col">
            {/* 如果用户已付费，显示"当前方案"，否则显示"立即升级"按钮 */}
            {isPaidUser ? (
              <Button className="w-full" variant="outline">
                {t("freePlan.currentPlan")}
              </Button>
            ) : (
              <UpgradeButton
                className="mt-[30px] font-NewYork"
                upgradeText={t("proPlan.upgrade")}
              />
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
