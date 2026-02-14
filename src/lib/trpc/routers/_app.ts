import { router, publicProcedure, protectedProcedure } from "../init";
import { z } from "zod";
import { ttsRouter } from "./tts";
import { aiRouter } from "./ai";

export const appRouter = router({
  // Public procedures - accessible without authentication
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.name ?? "World"}!`,
      };
    }),

  // Protected procedures - require authentication
  getUser: protectedProcedure.query(({ ctx }) => {
    return {
      user: ctx.user,
    };
  }),

  // Feature routers
  tts: ttsRouter,
  ai: aiRouter,
});

// Export type router type signature
export type AppRouter = typeof appRouter;
