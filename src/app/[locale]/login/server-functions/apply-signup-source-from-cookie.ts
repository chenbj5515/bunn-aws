"use server";

import { applyColumnsAccessFromCookie } from "./apply-columns-access-from-cookie";

// 向后兼容：旧函数名保留，但实际逻辑已经切到“专栏查看权限”的落库
export async function applySignupSourceFromCookie() {
  return applyColumnsAccessFromCookie();
}


