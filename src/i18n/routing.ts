import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ["en", "zh"],

  // Used when no locale matches
  defaultLocale: "en",

  // The prefix for locale-specific URLs (default: "always")
  localePrefix: "always",
});

// Type helper for locale
export type Locale = (typeof routing.locales)[number];
