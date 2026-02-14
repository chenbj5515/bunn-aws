'use client';

import type { AppLocale, RequiredLocalizedText } from "@/types/locale";

export async function translateContext(content: string, sourceLang: AppLocale): Promise<RequiredLocalizedText> {
  return {
    zh: content,
    en: content,
    'zh-TW': content,
  };
}
