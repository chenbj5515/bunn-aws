"use client";

import { usePathname } from "next/navigation";
import { LandingFooter } from "@/components/landing-footer";

// 需要显示 Footer 的路由（和 Header 一样）
const LANDING_ROUTES = ["/home", "/pricing", "/guide"];

export function FooterWrapper() {
  const pathname = usePathname();

  // 提取不带 locale 前缀的路径
  const pathWithoutLocale = pathname.replace(/^\/(en|zh)/, "") || "/";

  // 判断是否是 landing 路由
  const isLandingRoute = LANDING_ROUTES.some(
    (route) =>
      pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`)
  );

  // 只在 landing 路由显示 footer
  if (!isLandingRoute) {
    return null;
  }

  return <LandingFooter />;
}
