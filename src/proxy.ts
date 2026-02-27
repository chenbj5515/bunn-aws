import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { auth } from "@/lib/auth";

// 创建 next-intl 中间件
const intlMiddleware = createMiddleware(routing);

// 公开路由（无需登录即可访问）
const PUBLIC_ROUTES = ["/home", "/pricing", "/guide", "/login"];

// 受保护路由（未登录时需要跳转到 home）
const PROTECTED_ROUTES = ["/daily-task", "/channels", "/getting-started"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 先执行 intl 中间件
  const response = intlMiddleware(request);

  // 提取不带 locale 前缀的路径
  const pathWithoutLocale = pathname.replace(/^\/(en|zh)/, "") || "/";

  // 检查是否是公开路由
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) =>
      pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`)
  );

  // 检查是否是受保护路由
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) =>
      pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`)
  );

  const locale = pathname.match(/^\/(en|zh)/)?.[1] || "en";
  const isRootOrHome =
    pathWithoutLocale === "/home" ||
    pathWithoutLocale === "/" ||
    pathWithoutLocale === "";

  // 仅在需要登录态判断的路径上查询 session，避免无意义的 auth 开销
  let isLoggedIn = false;
  if (isRootOrHome || isProtectedRoute) {
    const session = await auth.api.getSession({ headers: request.headers });
    isLoggedIn = !!session?.user?.id;
  }

  // 如果已登录且访问 home 或根路径，重定向到每日任务
  if (isLoggedIn && isRootOrHome) {
    const dailyTaskUrl = new URL(`/${locale}/daily-task`, request.url);
    return NextResponse.redirect(dailyTaskUrl);
  }

  // 如果未登录且访问受保护路由，重定向到 home
  if (!isLoggedIn && isProtectedRoute && !isPublicRoute) {
    const homeUrl = new URL(`/${locale}/home`, request.url);
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  // Match all pathnames except for:
  // - API routes (/api)
  // - Static files (/_next, /images, etc.)
  // - Files with extensions (.ico, .svg, etc.)
  matcher: [
    // Enable a redirect to a matching locale at the root
    "/",

    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    "/(en|zh)/:path*",

    // Enable redirects that add missing locales
    // (e.g. `/pathnames` -> `/en/pathnames`)
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
