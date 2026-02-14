import { createStore } from "jotai";

// 全局 store - 可以在任何地方读取/写入 atom 的最新值
export const store = createStore();

// Types & Enums & Factory functions
export * from "./types";

// All atoms
export * from "./_atoms";
