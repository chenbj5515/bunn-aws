'use client';

import { useTranslations } from 'next-intl';
import { AddMusicVideoDropdown } from './add-music-video-dropdown';
import { useMusicContext } from './music-provider';

export function EmptyMusicPage() {
  const t = useTranslations('music.emptyPage');
  const { isAdmin } = useMusicContext();

  return (
    <div className="relative flex justify-center items-center bg-linear-to-b from-gray-900 to-black h-screen">
      <div className="text-center">
        <h1 className="mb-4 font-bold text-2xl text-white">{t('title')}</h1>
        <p className="text-gray-400">
          {isAdmin ? t('adminDescription') : t('viewerDescription')}
        </p>
      </div>

      {isAdmin && <AddMusicVideoDropdown />}
    </div>
  );
}

export default EmptyMusicPage;
