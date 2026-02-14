import { router } from '../trpc';
import { aiRouter } from './ai';

/**
 * 根 Router - 聚合所有子 router
 */
export const appRouter = router({
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;