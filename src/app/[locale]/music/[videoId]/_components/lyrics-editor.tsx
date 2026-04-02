'use client';

import { useState } from 'react';
import { X, Loader2, Trash2, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { LyricLine } from '../page';
import type { WordSegmentationV2 } from '@/types/extended-memo-card';

type LyricTranslation = Record<string, string>;

interface LyricEntry {
  id: string;
  text: string;
  translation: LyricTranslation;
  startTime: string;
  endTime: string;
  wordSegmentation: WordSegmentationV2 | null;
  lastProcessedText: string;
  isProcessing: boolean;
  isOcrProcessing: boolean;
  lastProcessedTranslation: LyricTranslation;
  isTranslationProcessing: boolean;
}

interface ProcessedLyricResult {
  translation: LyricTranslation;
  wordSegmentation: WordSegmentationV2 | null;
}

function toHalfWidth(str: string): string {
  return str.replace(/[：]/g, ':').replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
}

function formatTimeInput(value: string): string {
  const digitsOnly = toHalfWidth(value).replace(/\D/g, '').slice(0, 4);

  if (digitsOnly.length <= 2) {
    return digitsOnly;
  }

  return `${digitsOnly.slice(0, 2)}:${digitsOnly.slice(2)}`;
}

function isCompleteTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

function isTimeEarlierThan(left: string, right: string): boolean {
  return parseTimeToMs(left) < parseTimeToMs(right);
}

interface LyricsEditorProps {
  videoId: string;
  videoTitle: string | null;
  existingLyrics: LyricLine[];
  adminUserId: string;
  onSubmit: (lyrics: LyricLine[]) => void;
  onCancel: () => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function parseTimeToMs(time: string): number {
  const parts = time.split(':');
  if (parts.length !== 2) return 0;
  const minutes = parseInt(parts[0]) || 0;
  const seconds = parseInt(parts[1]) || 0;
  return (minutes * 60 + seconds) * 1000;
}

function formatMsToTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function parseTimeFromUrl(contextUrl: string | null): number {
  if (!contextUrl) return 0;
  try {
    const url = new URL(contextUrl);
    const tParam = url.searchParams.get('t');
    if (!tParam) return 0;
    return (parseInt(tParam) || 0) * 1000;
  } catch {
    return 0;
  }
}

function createEmptyEntry(): LyricEntry {
  return {
    id: generateId(),
    text: '',
    translation: {},
    startTime: '',
    endTime: '',
    wordSegmentation: null,
    lastProcessedText: '',
    isProcessing: false,
    isOcrProcessing: false,
    lastProcessedTranslation: {},
    isTranslationProcessing: false,
  };
}

function normalizeTranslation(
  translation: Record<string, string> | string
): LyricTranslation {
  if (typeof translation === 'string') {
    return translation ? { zh: translation } : {};
  }

  return translation;
}

function getTranslationByLocale(
  translation: LyricTranslation,
  locale: string
): string {
  if (locale === 'zh-TW') {
    return translation['zh-TW'] || translation.zh || '';
  }

  if (locale === 'zh') {
    return translation.zh || translation['zh-TW'] || '';
  }

  return translation.en || '';
}

function getTranslationInputValue(
  translation: LyricTranslation,
  locale: string
): string {
  return translation[locale] || '';
}

function setTranslationByLocale(
  translation: LyricTranslation,
  locale: string,
  value: string
): LyricTranslation {
  const nextTranslation = { ...translation };

  if (!value.trim()) {
    delete nextTranslation[locale];
    return nextTranslation;
  }

  return {
    ...nextTranslation,
    [locale]: value,
  };
}

export function LyricsEditor({
  videoId,
  videoTitle,
  existingLyrics,
  onSubmit,
  onCancel,
}: LyricsEditorProps) {
  const locale = useLocale();
  const t = useTranslations('music.lyricsEditor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [entries, setEntries] = useState<LyricEntry[]>(() => {
    if (existingLyrics.length > 0) {
      return existingLyrics.map((lyric) => {
        const translation = normalizeTranslation(lyric.translation);

        return {
          id: lyric.id,
          text: lyric.originalText,
          translation,
          startTime: formatMsToTime(parseTimeFromUrl(lyric.contextUrl)),
          endTime: lyric.endTimeMs ? formatMsToTime(lyric.endTimeMs) : '',
          wordSegmentation: lyric.wordSegmentation,
          lastProcessedText: lyric.originalText,
          isProcessing: false,
          isOcrProcessing: false,
          lastProcessedTranslation: { ...translation },
          isTranslationProcessing: false,
        };
      });
    }
    return [createEmptyEntry()];
  });

  async function processLyrics(texts: string[]): Promise<ProcessedLyricResult[]> {
    const response = await fetch('/api/music/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        songTitle: videoTitle || t('unknownSong'),
        lyrics: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(t('errors.processFailed'));
    }

    const data = await response.json();
    if (Array.isArray(data.items)) {
      return data.items;
    }

    return texts.map((_, index) => ({
      translation: data.translations?.[index] || {},
      wordSegmentation: null,
    }));
  }

  async function regenerateTranslation(
    sourceText: string,
    sourceLocale: string,
    originalLyric: string
  ): Promise<LyricTranslation> {
    const response = await fetch('/api/music/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        songTitle: videoTitle || t('unknownSong'),
        originalLyric,
        sourceLocale,
        translationText: sourceText,
      }),
    });

    if (!response.ok) {
      throw new Error(t('errors.regenerateFailed'));
    }

    const data = await response.json();
    return data.translation || {};
  }

  async function processOcrImage(file: File): Promise<string[]> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('videoId', videoId);

    const response = await fetch('/api/music/ocr', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(t('errors.ocrFailed'));
    }

    const data = await response.json();
    return Array.isArray(data.lines) ? data.lines : [];
  }

  async function processEntries(entryIds: string[], texts: string[]) {
    const trimmedTexts = texts.map((text) => text.trim());
    const idSet = new Set(entryIds);
    const trimmedTextMap = new Map(entryIds.map((id, index) => [id, trimmedTexts[index]]));

    setError(null);
    setEntries((prev) =>
      prev.map((entry) =>
        idSet.has(entry.id)
          ? {
              ...entry,
              isProcessing: true,
              wordSegmentation: null,
            }
          : entry
      )
    );

    try {
      const results = await processLyrics(trimmedTexts);

      setEntries((prev) =>
        prev.map((entry) => {
          if (!idSet.has(entry.id)) {
            return entry;
          }

          const resultIndex = entryIds.indexOf(entry.id);
          const processedText = trimmedTextMap.get(entry.id) || '';
          const result = results[resultIndex];

          return {
            ...entry,
            translation: result?.translation || {},
            wordSegmentation: result?.wordSegmentation || null,
            lastProcessedText: processedText,
            lastProcessedTranslation: { ...(result?.translation || {}) },
            isProcessing: false,
          };
        })
      );
    } catch (err) {
      console.error('Lyrics process error:', err);
      setError(err instanceof Error ? err.message : t('errors.processFailed'));
      setEntries((prev) =>
        prev.map((entry) =>
          idSet.has(entry.id)
            ? {
                ...entry,
                isProcessing: false,
              }
            : entry
        )
      );
    }
  }

  async function handleTextBlur(
    entryId: string,
    text: string,
    lastProcessedText: string
  ) {
    const trimmedText = text.trim();

    if (!trimmedText || trimmedText === lastProcessedText) {
      return;
    }

    await processEntries([entryId], [trimmedText]);
  }

  async function handleTranslationBlur(
    entryId: string,
    sourceText: string,
    sourceLocale: string,
    originalLyric: string,
    lastProcessedTranslation: LyricTranslation
  ) {
    const trimmedText = sourceText.trim();
    const trimmedOriginalLyric = originalLyric.trim();
    const previousText = getTranslationInputValue(lastProcessedTranslation, sourceLocale).trim();

    if (!trimmedText || !trimmedOriginalLyric || trimmedText === previousText) {
      return;
    }

    setError(null);
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, isTranslationProcessing: true } : entry
      )
    );

    try {
      const translation = await regenerateTranslation(
        trimmedText,
        sourceLocale,
        trimmedOriginalLyric
      );

      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                translation,
                lastProcessedTranslation: { ...translation },
                isTranslationProcessing: false,
              }
            : entry
        )
      );
    } catch (err) {
      console.error('Translation regenerate error:', err);
      setError(err instanceof Error ? err.message : t('errors.regenerateFailed'));
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, isTranslationProcessing: false } : entry
        )
      );
    }
  }

  async function handleImageSelect(entryId: string, file: File) {
    setError(null);
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, isOcrProcessing: true } : entry
      )
    );

    try {
      const rawLines = await processOcrImage(file);
      const lines = rawLines.map((line) => line.trim()).filter(Boolean);

      if (lines.length === 0) {
        setError(t('errors.noOcrText'));
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === entryId ? { ...entry, isOcrProcessing: false } : entry
          )
        );
        return;
      }

      const newEntryIds = [entryId, ...lines.slice(1).map(() => generateId())];

      setEntries((prev) => {
        const entryIndex = prev.findIndex((entry) => entry.id === entryId);
        if (entryIndex === -1) {
          return prev;
        }

        const currentEntry = prev[entryIndex];
        const prevEntry = entryIndex > 0 ? prev[entryIndex - 1] : null;
        let minutePrefix = '';

        if (currentEntry.endTime && /^\d{2}:\d{2}$/.test(currentEntry.endTime)) {
          minutePrefix = currentEntry.endTime.slice(0, 3);
        } else if (currentEntry.startTime && /^\d{2}:\d{2}$/.test(currentEntry.startTime)) {
          minutePrefix = currentEntry.startTime.slice(0, 3);
        } else if (prevEntry?.endTime && /^\d{2}:\d{2}$/.test(prevEntry.endTime)) {
          minutePrefix = prevEntry.endTime.slice(0, 3);
        } else if (prevEntry?.startTime && /^\d{2}:\d{2}$/.test(prevEntry.startTime)) {
          minutePrefix = prevEntry.startTime.slice(0, 3);
        }

        const nextEntries = [...prev];
        nextEntries[entryIndex] = {
          ...currentEntry,
          text: lines[0],
          translation: {},
          startTime: currentEntry.startTime || minutePrefix,
          endTime: currentEntry.endTime || minutePrefix,
          wordSegmentation: null,
          lastProcessedText: '',
          isProcessing: true,
          isOcrProcessing: false,
          lastProcessedTranslation: {},
          isTranslationProcessing: false,
        };

        if (lines.length > 1) {
          const additionalEntries = lines.slice(1).map((line, index) => ({
            ...createEmptyEntry(),
            id: newEntryIds[index + 1],
            text: line,
            startTime: minutePrefix,
            endTime: minutePrefix,
            isProcessing: true,
          }));
          nextEntries.splice(entryIndex + 1, 0, ...additionalEntries);
        }

        return nextEntries;
      });

      await processEntries(newEntryIds, lines);
    } catch (err) {
      console.error('OCR error:', err);
      setError(err instanceof Error ? err.message : t('errors.ocrFailed'));
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                isOcrProcessing: false,
                isProcessing: false,
              }
            : entry
        )
      );
    }
  }

  function handleEntryChange(id: string, field: keyof LyricEntry, value: string) {
    let processedValue = value;
    if (field === 'startTime' || field === 'endTime') {
      processedValue = formatTimeInput(value);
    }
    setEntries((prev) => {
      const index = prev.findIndex((entry) => entry.id === id);
      if (index === -1) return prev;

      const currentEntry = prev[index];
      let updatedEntry = { ...currentEntry, [field]: processedValue };

      if (field === 'text') {
        updatedEntry = {
          ...updatedEntry,
          wordSegmentation: null,
        };
      }

      if (field === 'startTime' && isCompleteTime(processedValue)) {
        const endTime = updatedEntry.endTime;
        if (!endTime || !isCompleteTime(endTime) || isTimeEarlierThan(endTime, processedValue)) {
          updatedEntry = { ...updatedEntry, endTime: processedValue };
        }
      }

      const newEntries = prev.map((entry) =>
        entry.id === id ? updatedEntry : entry
      );

      if (field === 'endTime' && isCompleteTime(processedValue)) {
        const nextIndex = index + 1;
        if (nextIndex < newEntries.length) {
          const nextEntry = newEntries[nextIndex];
          if (nextEntry.text.trim() !== '') {
            newEntries[nextIndex] = { ...nextEntry, startTime: processedValue };
          }
        }
      }

      return newEntries;
    });
  }

  function handleTimeBlur(id: string, field: 'startTime' | 'endTime') {
    setEntries((prev) => {
      const index = prev.findIndex((entry) => entry.id === id);
      if (index === -1) return prev;

      const currentEntry = prev[index];
      const startTime = currentEntry.startTime;
      const endTime = currentEntry.endTime;

      if (!isCompleteTime(startTime)) {
        return prev;
      }

      const shouldSyncEndTime =
        !endTime || !isCompleteTime(endTime) || isTimeEarlierThan(endTime, startTime);

      if (!shouldSyncEndTime) {
        return prev;
      }

      const nextEntries = [...prev];
      nextEntries[index] = {
        ...currentEntry,
        endTime: startTime,
      };

      if (field === 'endTime') {
        const nextIndex = index + 1;
        if (nextIndex < nextEntries.length) {
          const nextEntry = nextEntries[nextIndex];
          if (nextEntry.text.trim() !== '') {
            nextEntries[nextIndex] = { ...nextEntry, startTime };
          }
        }
      }

      return nextEntries;
    });
  }

  function handleDeleteEntry(id: string) {
    setEntries((prev) => {
      const filtered = prev.filter((entry) => entry.id !== id);
      return filtered.length === 0 ? [createEmptyEntry()] : filtered;
    });
  }

  function handleInsertAfter(id: string) {
    setEntries((prev) => {
      const index = prev.findIndex((entry) => entry.id === id);
      if (index === -1) return prev;

      const currentEntry = prev[index];
      const isCurrentEmpty = !currentEntry.text.trim();

      let startTime = '';
      let endTime = '';

      if (!isCurrentEmpty) {
        if (currentEntry.endTime && /^\d{2}:\d{2}$/.test(currentEntry.endTime)) {
          startTime = currentEntry.endTime;
          endTime = currentEntry.endTime;
        }
      } else {
        let minutePrefix = '';
        if (currentEntry.endTime && /^\d{2}:\d{2}$/.test(currentEntry.endTime)) {
          minutePrefix = currentEntry.endTime.slice(0, 3);
        } else if (currentEntry.startTime && /^\d{2}:\d{2}$/.test(currentEntry.startTime)) {
          minutePrefix = currentEntry.startTime.slice(0, 3);
        }
        startTime = minutePrefix;
        endTime = minutePrefix;
      }

      const newEntry: LyricEntry = {
        ...createEmptyEntry(),
        startTime,
        endTime,
      };

      const newEntries = [...prev];
      newEntries.splice(index + 1, 0, newEntry);
      return newEntries;
    });
  }

  async function handlePaste(entryId: string, e: React.ClipboardEvent<HTMLInputElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleImageSelect(entryId, file);
        }
        return;
      }
    }
  }

  function validateEntries(): boolean {
    const nonEmptyEntries = entries.filter((e) => e.text.trim());

    if (nonEmptyEntries.length === 0) {
      setError(t('errors.emptyLyrics'));
      return false;
    }

    for (const entry of nonEmptyEntries) {
      if (!entry.startTime || !entry.endTime) {
        setError(t('errors.timeRequired'));
        return false;
      }
      if (!/^\d{2}:\d{2}$/.test(entry.startTime) || !/^\d{2}:\d{2}$/.test(entry.endTime)) {
        setError(t('errors.invalidTimeFormat'));
        return false;
      }
    }
    return true;
  }

  async function handleSubmit() {
    if (!validateEntries()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const nonEmptyEntries = entries.filter((e) => e.text.trim());

      const lyricsData = nonEmptyEntries.map((entry) => ({
        originalText: entry.text.trim(),
        translation: entry.translation,
        startTimeMs: parseTimeToMs(entry.startTime),
        endTimeMs: parseTimeToMs(entry.endTime),
        wordSegmentation: entry.wordSegmentation,
      }));

      const response = await fetch('/api/music/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          lyrics: lyricsData,
        }),
      });

      if (!response.ok) {
        throw new Error(t('errors.saveFailed'));
      }

      const data = await response.json();
      onSubmit(data.lyrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailedGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasProcessingEntries = entries.some(
    (e) => e.isProcessing || e.isOcrProcessing || e.isTranslationProcessing
  );

  return (
    <div className="z-(--z-overlay) fixed inset-0 flex flex-col bg-black/95 backdrop-blur-xl">
      <button
        onClick={onCancel}
        className="top-4 right-4 absolute bg-white/10 hover:bg-white/20 p-2 rounded-full text-gray-400 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {error && (
        <div className="top-4 left-1/2 absolute bg-red-500/20 px-4 py-2 rounded-lg text-red-300 text-sm -translate-x-1/2">
          {error}
        </div>
      )}

      <div className="flex flex-col flex-1 px-6 pt-16 pb-24 min-h-0">
        <div className="mx-auto w-full max-w-4xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-white text-xl">{t('title')}</h2>
          </div>

          <div className="gap-2 grid grid-cols-[1fr_1fr_100px_100px_80px] mb-2 text-gray-400 text-sm">
            <div>{t('columns.original')}</div>
            <div>{t('columns.translation')}</div>
            <div>{t('columns.startTime')}</div>
            <div>{t('columns.endTime')}</div>
            <div></div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-2 mx-auto max-w-4xl">
          {entries.map((entry) => (
            <div key={entry.id} className="group">
              <div className="items-center gap-2 grid grid-cols-[1fr_1fr_100px_100px_80px]">
                <div className="relative">
                  <input
                    type="text"
                    value={entry.text}
                    onChange={(e) => handleEntryChange(entry.id, 'text', e.target.value)}
                    onBlur={() =>
                      handleTextBlur(entry.id, entry.text, entry.lastProcessedText)
                    }
                    onPaste={(e) => handlePaste(entry.id, e)}
                    className="bg-white/10 px-3 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 w-full text-white placeholder-gray-500"
                    placeholder={t('placeholders.original')}
                    disabled={entry.isProcessing || entry.isOcrProcessing}
                  />
                  {entry.isOcrProcessing && (
                    <div className="top-1/2 right-3 absolute flex items-center gap-1.5 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      <span className="text-blue-400 text-xs">{t('ocrProcessing')}</span>
                    </div>
                  )}
                  {entry.isProcessing && !entry.isOcrProcessing && (
                    <div className="top-1/2 right-3 absolute -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={getTranslationInputValue(entry.translation, locale)}
                    onChange={(e) =>
                      setEntries((prev) =>
                        prev.map((currentEntry) =>
                          currentEntry.id === entry.id
                            ? {
                                ...currentEntry,
                                translation: setTranslationByLocale(
                                  currentEntry.translation,
                                  locale,
                                  e.target.value
                                ),
                              }
                            : currentEntry
                        )
                      )
                    }
                    onBlur={() =>
                      handleTranslationBlur(
                        entry.id,
                        getTranslationInputValue(entry.translation, locale),
                        locale,
                        entry.text,
                        entry.lastProcessedTranslation
                      )
                    }
                    className="bg-white/10 px-3 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 w-full text-white placeholder-gray-500"
                    placeholder={t('placeholders.translation')}
                    disabled={
                      entry.isTranslationProcessing || entry.isProcessing || entry.isOcrProcessing
                    }
                  />
                  {entry.isTranslationProcessing && (
                    <div className="top-1/2 right-3 absolute -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={entry.startTime}
                  onChange={(e) => handleEntryChange(entry.id, 'startTime', e.target.value)}
                  onBlur={() => handleTimeBlur(entry.id, 'startTime')}
                  inputMode="numeric"
                  className="bg-white/10 px-3 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white text-center placeholder-gray-500"
                  placeholder="00:00"
                />
                <input
                  type="text"
                  value={entry.endTime}
                  onChange={(e) => handleEntryChange(entry.id, 'endTime', e.target.value)}
                  onBlur={() => handleTimeBlur(entry.id, 'endTime')}
                  inputMode="numeric"
                  className="bg-white/10 px-3 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 text-white text-center placeholder-gray-500"
                  placeholder="00:00"
                />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleInsertAfter(entry.id)}
                    className="p-2 text-gray-400 hover:text-green-400 transition-colors"
                    title={t('actions.insertAfter')}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title={t('actions.deleteLine')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>

      <div className="right-0 bottom-0 left-0 absolute flex justify-end gap-3 bg-black/80 backdrop-blur-sm p-4 border-white/10 border-t">
        <button
          onClick={onCancel}
          className="hover:bg-white/10 px-6 py-2 rounded-lg text-gray-300 transition-colors"
        >
          {t('actions.cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || hasProcessingEntries}
          className="bg-white hover:bg-gray-200 disabled:opacity-50 px-6 py-2 rounded-lg font-medium text-black transition-colors disabled:cursor-not-allowed"
        >
          {isSubmitting ? <Loader2 className="inline mr-2 w-4 h-4 animate-spin" /> : null}
          {t('actions.save')}
        </button>
      </div>
    </div>
  );
}

export default LyricsEditor;

// 00:27
// 00:32
// 00:36
// 00:41
// 00:45
// 00:47
// 00:52
// 00:57
// 01:01
// 01:08