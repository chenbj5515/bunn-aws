"use client";

import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "./routers/_app";

/**
 * React Query 集成的 tRPC client
 * 用于 hooks（useQuery, useMutation 等）
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Vanilla tRPC client
 * 用于非 React 环境或需要直接调用的场景（如 TTS）
 *
 * 注意：流式 AI 对话已迁移到 /api/ai/chat API Route
 * 使用 fetch + ReadableStream 处理流式响应
 *
 * @example
 * const result = await vanillaTrpc.tts.synthesize.mutate({ text: "hello" });
 */
export const vanillaTrpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
    }),
  ],
});
