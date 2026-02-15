"use client";

import { usePathname } from "next/navigation";
import { LandingHeader } from "@/components/landing-header";
import UserPanel from "@/components/user-panel";

// 需要显示 LandingHeader 的路由
const LANDING_ROUTES = ["/home", "/pricing", "/guide"];

interface HeaderWrapperProps {
  isLoggedIn: boolean;
  user?: {
    id: string;
    email: string;
    image?: string | null;
  } | null;
  subscription?: {
    active: boolean;
    expireTime: string;
    type?: "subscription" | "oneTime" | null;
  };
  achievementPoints?: number;
}

export function HeaderWrapper({
  isLoggedIn,
  user,
  subscription,
  achievementPoints = 0,
}: HeaderWrapperProps) {
  const pathname = usePathname();

  // 提取不带 locale 前缀的路径
  const pathWithoutLocale = pathname.replace(/^\/(en|zh)/, "") || "/";

  // 判断是否是 landing 路由
  const isLandingRoute = LANDING_ROUTES.some(
    (route) =>
      pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`)
  );

  // 登录页面不显示任何 header
  if (pathWithoutLocale === "/login" || pathWithoutLocale.startsWith("/login")) {
    return null;
  }

  // 如果是 landing 路由，显示 LandingHeader
  if (isLandingRoute) {
    return <LandingHeader isLoggedIn={isLoggedIn} userImage={user?.image} />;
  }

  // 其他路由，如果用户已登录，显示 UserPanel（原来的 Header）
  if (isLoggedIn && user && subscription) {
    return (
      <header className="top-4 left-4 z-50 absolute">
        <UserPanel
          user={{
            id: user.id,
            email: user.email,
            image: user.image || null,
          }}
          subscription={subscription}
          initialAchievementPoints={achievementPoints}
        />
      </header>
    );
  }

  // 未登录且不是 landing 路由 - 中间件应该已经重定向了
  return null;
}
