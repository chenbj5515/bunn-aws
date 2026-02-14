import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

type CreateContextOpts = { req?: Request } | Headers;

/**
 * 创建 tRPC 请求上下文
 * - 由 fetch 适配器调用时传入 { req }
 * - 由 getServerTrpc(overrideHeaders) 调用时传入 Headers（如后台任务的 Cookie）
 * - 否则使用 next/headers
 */
export async function createContext(opts?: CreateContextOpts) {
  const h =
    opts instanceof Headers ? opts
    : opts?.req ? opts.req.headers
    : await headers();
  const session = await auth.api.getSession({ headers: h });
  return {
    session: session?.session ?? null,
    user: session?.user ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
