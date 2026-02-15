"use server";

import { cookies } from "next/headers";
import { stripe } from "@/stripe";
import { getSession } from "@/lib/auth";
import Stripe from "stripe";

export async function createCheckoutSession({
  paymentType = "card",
  returnPath = "/pricing",
}: {
  paymentType?: "card" | "alipay" | "wechat";
  returnPath?: string;
} = {}) {
  const data = await getSession();
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  if (!data?.session?.userId) {
    const normalizedReturnPath = returnPath.startsWith("/")
      ? returnPath
      : `/${returnPath}`;
    return { url: `/${locale}/login?redirect=/${locale}${normalizedReturnPath}` };
  }

  // 根据支付方式决定模式和价格ID
  const mode: Stripe.Checkout.SessionCreateParams.Mode =
    paymentType === "card" ? "subscription" : "payment";
  const priceId =
    paymentType === "card"
      ? process.env.STRIPE_PRICE_ID
      : process.env.STRIPE_PRICE_ID_ONE_MONTH_ACCESS;

  const normalizedReturnPath = returnPath.startsWith("/")
    ? returnPath
    : `/${returnPath}`;
  const checkoutSession = await stripe.checkout.sessions.create({
    mode,
    client_reference_id: data.session.userId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    // 把 userId 保存到订阅的 metadata 中，续订时可以通过这个找到用户
    ...(mode === "subscription" && {
      subscription_data: {
        metadata: {
          userId: data.session.userId,
        },
      },
    }),
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${locale}?payment_success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${locale}${normalizedReturnPath}`,
  });

  return { url: checkoutSession.url };
}
