"use client";

import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, unstable_httpBatchStreamLink } from "@trpc/client";
import type { AppRouter } from "./routers/_app";

/**
 * React Query 集成的 tRPC client
 * 用于 hooks（useQuery, useMutation 等）
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Vanilla tRPC client
 * 使用 httpBatchStreamLink 支持流式响应
 *
 * @example
 * const result = await vanillaTrpc.tts.synthesize.mutate({ text: "hello" });
 *
 * // 流式调用
 * for await (const chunk of vanillaTrpc.ai.streamChat.mutate({ prompt: "hello" })) {
 *   console.log(chunk);
 * }
 */
export const vanillaTrpc = createTRPCClient<AppRouter>({
  links: [
    unstable_httpBatchStreamLink({
      url: "/api/trpc",
    }),
  ],
});
