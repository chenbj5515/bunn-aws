import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/**
 * Example atoms for Jotai state management
 * Add your application-specific atoms here
 */

// Simple atom example
export const countAtom = atom(0);

// Derived atom example
export const doubleCountAtom = atom((get) => get(countAtom) * 2);

// Atom with storage (persists to localStorage)
export const themeAtom = atomWithStorage<"light" | "dark" | "system">(
  "theme",
  "system"
);

// Example: User preferences atom
export const userPreferencesAtom = atomWithStorage("user-preferences", {
  sidebarOpen: true,
  compactMode: false,
});
