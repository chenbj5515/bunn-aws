import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { getSession } from '@/lib/auth';
import { TRPCCode } from './types';

export { TRPCCode };

/**
 * tRPC Context - 每个请求都会创建
 */
export async function createContext() {
  const session = await getSession();
  return {
    session,
    user: session?.user ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * tRPC 初始化
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        errorCode: (error.cause as any)?.errorCode,
      },
    };
  },
});

/**
 * 基础导出
 */
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * 需要登录的 Procedure
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: TRPCCode.UNAUTHORIZED,
      message: '请先登录',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});