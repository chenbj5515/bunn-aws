'use client';

import { Music2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface LyricsButtonProps {
  hasLyrics: boolean;
  onClick: () => void;
}

export function LyricsButton({ hasLyrics, onClick }: LyricsButtonProps) {
  const t = useTranslations('music.lyricsButton');

  return (
    <button
      onClick={onClick}
      className="flex justify-center items-center gap-1.5 bg-black/80 hover:bg-black shadow-lg backdrop-blur-sm px-4 rounded-full h-12 transition-colors"
      title={hasLyrics ? t('edit') : t('add')}
    >
      {hasLyrics ? (
        <>
          <Music2 className="w-4 h-4 text-white" />
          <span className="text-sm text-white">{t('edit')}</span>
        </>
      ) : (
        <>
          <Plus className="w-4 h-4 text-white" />
          <span className="text-sm text-white">{t('add')}</span>
        </>
      )}
    </button>
  );
}

export default LyricsButton;
