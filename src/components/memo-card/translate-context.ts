'use client';

export async function translateContext(content: string, sourceLang: 'zh' | 'en' | 'zh-TW') {
  return {
    zh: content,
    en: content,
    'zh-TW': content,
  } as { zh: string; en: string; 'zh-TW': string };
}
