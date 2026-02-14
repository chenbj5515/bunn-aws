"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

const SIGNUP_SOURCE_COOKIE = "bunn_signup_source";

function isValidSignupSource(value: string) {
  // 只允许非常简单、可扩展的来源格式：<kind>:<key>
  // 例如：column_store:xinqidian
  return /^[a-z0-9_-]+:[a-z0-9_-]+$/i.test(value);
}

function shouldGrantColumnsAccess(value: string) {
  const kind = value.split(":", 1)[0] || "";
  // 兼容历史/未来 key：当前专栏相关入口主要来自 column_store:*
  return kind === "column_store" || kind === "store";
}

export async function applyColumnsAccessFromCookie() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  const cookieStore = await cookies();
  const raw = cookieStore.get(SIGNUP_SOURCE_COOKIE)?.value || "";
  if (!raw) return;
  if (!isValidSignupSource(raw)) {
    cookieStore.set(SIGNUP_SOURCE_COOKIE, "", { path: "/", maxAge: 0 });
    return;
  }
  if (!shouldGrantColumnsAccess(raw)) {
    cookieStore.set(SIGNUP_SOURCE_COOKIE, "", { path: "/", maxAge: 0 });
    return;
  }

  const record = await db.query.user.findFirst({
    where: eq(userTable.id, userId),
    columns: {
      id: true,
      createdAt: true,
      canViewColumns: true,
    },
  });

  if (!record) {
    cookieStore.set(SIGNUP_SOURCE_COOKIE, "", { path: "/", maxAge: 0 });
    return;
  }

  // 已经标记过就直接清 cookie，避免重复请求
  if (record.canViewColumns) {
    cookieStore.set(SIGNUP_SOURCE_COOKIE, "", { path: "/", maxAge: 0 });
    return;
  }

  const createdAtMs = new Date(record.createdAt).getTime();
  const nowMs = Date.now();
  const sixHoursMs = 6 * 60 * 60 * 1000;

  // 只对“新创建不久”的用户写入权限，避免给历史用户误打标
  if (!Number.isFinite(createdAtMs) || nowMs - createdAtMs > sixHoursMs) {
    cookieStore.set(SIGNUP_SOURCE_COOKIE, "", { path: "/", maxAge: 0 });
    return;
  }

  await db.update(userTable).set({ canViewColumns: true }).where(eq(userTable.id, userId));

  cookieStore.set(SIGNUP_SOURCE_COOKIE, "", { path: "/", maxAge: 0 });
}



