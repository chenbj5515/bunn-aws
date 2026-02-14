import 'server-only';
import { createCallerFactory } from './init';
import { createContext } from './context';
import { appRouter } from './routers/_app';

const createCaller = createCallerFactory(appRouter);

/** Server 端调用 tRPC，支持传入 headers（如后台任务传入 Cookie） */
export async function getServerTrpc(overrideHeaders?: Headers) {
  const context = await createContext(overrideHeaders);
  return createCaller(context);
}
