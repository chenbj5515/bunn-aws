"use client";

import { useState } from "react";
import { createCheckoutSession } from "../_server-functions/create-checkout-session";
import { LoadingButton } from "@/components/ui/loading-button";

type PaymentType = "card" | "alipay" | "wechat";

export function UpgradeButton({
  upgradeText,
  paymentType = "card",
  className,
  returnPath,
}: {
  upgradeText: string;
  paymentType?: PaymentType;
  className?: string;
  returnPath?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    try {
      setIsLoading(true);
      const { url } = await createCheckoutSession({ paymentType, returnPath });
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Failed to create checkout session:", error);
    }
  };

  return (
    <LoadingButton
      isLoading={isLoading}
      loaderColor="white"
      onClick={handleUpgrade}
      className={`h-[42px] w-full ${className || ""}`}
    >
      {upgradeText}
    </LoadingButton>
  );
}
