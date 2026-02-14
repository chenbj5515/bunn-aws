import { atom } from "jotai";
import type { DeleteState } from "../types";
import { createInitialDeleteState } from "../types";

// ============================================
// 核心状态
// ============================================

/**
 * 删除状态
 */
export const deleteStateAtom = atom<DeleteState>(
  createInitialDeleteState()
);

// ============================================
// 派生状态
// ============================================

/** 是否正在删除 */
export const isDeletingChannelAtom = atom((get) => get(deleteStateAtom).isDeletingChannel);

// ============================================
// Action Atoms
// ============================================

/**
 * 设置删除状态
 */
export const setDeleteStateAtom = atom(
  null,
  (_get, set, isDeletingChannel: boolean) => {
    set(deleteStateAtom, { isDeletingChannel });
  }
);
