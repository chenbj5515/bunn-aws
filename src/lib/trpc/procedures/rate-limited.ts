/**
 * 需要登录 + 用量配额检查的 Procedure
 *
 * 限制规则：
 * - 订阅用户：订阅周期内成本 < $4
 * - 免费用户：当日成本 < $0.1
 *
 * 返回 ctx.rateLimited: boolean，由业务逻辑决定如何处理
 */

import { protectedProcedure } from '../init';
import { checkLimit } from '@/lib/auth/billing';

export const rateLimitedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const withinLimit = await checkLimit();
  return next({ ctx: { ...ctx, rateLimited: !withinLimit } });
});
