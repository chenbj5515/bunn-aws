"use client"

import React, { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cloneSampleCards } from "./server-functions";

export default function GettingStartedPage() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [isRedLoading, setIsRedLoading] = useState(false);
  const [isBlueLoading, setIsBlueLoading] = useState(false);

  const handleImportData = async () => {
    setIsBlueLoading(true);
    
    try {
      const result = await cloneSampleCards();
      
      if (!result.success) {
        const errorMessages: Record<string, string> = {
          no_new_cards: t("noNewCards"),
          unauthorized: t("unauthorized"),
          no_admin: t("noAdmin"),
          internal_error: t("internalError"),
        };
        toast.error((result.error && errorMessages[result.error]) || t("importFailed"));
        setIsBlueLoading(false);
        return;
      }

      const successResult = result as { success: true; count: number };
      toast.success(t("importSuccess", { count: successResult.count }));
      
      setTimeout(() => {
        router.push("/daily-task");
      }, 1000);
    } catch (error) {
      console.error("Import error:", error);
      toast.error(t("internalError"));
      setIsBlueLoading(false);
    }
  };

  const handlePillSelect = async (pill: "red" | "blue") => {
    if (isRedLoading || isBlueLoading) return;

    if (pill === "red") {
      setIsRedLoading(true);
      router.push("/safari");
    } else {
      handleImportData();
    }
  };

  return (
    <div className="flex justify-center items-center pb-20 h-[calc(100vh-64px)]">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex flex-col justify-center items-center w-full"
        >
          {/* 标题区 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-12 text-center"
          >
            <h1 className="mb-4 font-light text-gray-800 text-4xl md:text-5xl uppercase tracking-wider">
              {t("title")}
            </h1>
            <p className="text-gray-600 text-lg">
              {t("subtitle")}
            </p>
          </motion.div>

          {/* 选项选择区 */}
          <div className="flex justify-center items-center gap-32 md:gap-64">
            {/* 自己探索选项 - 红色胶囊 */}
            <motion.div className="flex flex-col items-center w-64">
              <div
                className="flex flex-col items-center w-full cursor-pointer"
                onClick={() => !isRedLoading && handlePillSelect("red")}
              >
                <div className="flex justify-center w-full">
                  <motion.div
                    animate={
                      isRedLoading
                        ? {
                            scale: [1, 1.05, 1],
                            transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                          }
                        : {}
                    }
                    className="relative"
                    whileHover={!isRedLoading && !isBlueLoading ? { scale: 1.1, y: -5 } : {}}
                  >
                    <Image
                      src="/assets/red.png"
                      alt={t("cards.youtube.title")}
                      width={150}
                      height={75}
                      className={`cursor-pointer ${isRedLoading ? "opacity-70" : ""}`}
                    />
                    {isRedLoading && (
                      <div className="absolute inset-0 flex justify-center items-center">
                        <div className="border-white border-t-2 border-b-2 rounded-full w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </motion.div>
                </div>
                <div className="mt-8 w-full text-center">
                  <h3 className="mb-2 font-semibold text-2xl">{t("cards.youtube.title")}</h3>
                  <p className="text-gray-600">{t("cards.youtube.desc")}</p>
                </div>
              </div>
            </motion.div>

            {/* 使用示例数据选项 - 蓝色胶囊 */}
            <motion.div className="group flex flex-col items-center w-64">
              <div
                className="flex flex-col items-center w-full cursor-pointer"
                onClick={() => !isBlueLoading && handlePillSelect("blue")}
              >
                <div className="flex justify-center w-full">
                  <motion.div
                    animate={
                      isBlueLoading
                        ? {
                            scale: [1, 1.05, 1],
                            transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                          }
                        : {}
                    }
                    className="relative"
                    whileHover={!isBlueLoading ? { scale: 1.1, y: -5 } : {}}
                  >
                    <Image
                      src="/assets/blue.png"
                      alt={t("cards.netflix.title")}
                      width={150}
                      height={75}
                      className={`cursor-pointer ${isBlueLoading ? "opacity-70" : ""}`}
                    />
                    {isBlueLoading && (
                      <div className="absolute inset-0 flex justify-center items-center">
                        <div className="border-white border-t-2 border-b-2 rounded-full w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </motion.div>
                </div>
                <div className="mt-8 w-full text-center">
                  <h3 className="mb-2 font-semibold text-2xl">{t("cards.netflix.title")}</h3>
                  <p className="text-gray-600">{t("cards.netflix.desc")}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
