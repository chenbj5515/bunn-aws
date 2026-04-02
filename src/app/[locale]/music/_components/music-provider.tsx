'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { MusicVideoInfo } from '../layout';

interface MusicContextValue {
  musicVideosList: MusicVideoInfo[];
  isAdmin: boolean;
  currentUserId: string;
}

const MusicContext = createContext<MusicContextValue | null>(null);

export function useMusicContext() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusicContext must be used within MusicProvider');
  }
  return context;
}

interface MusicProviderProps {
  children: ReactNode;
  musicVideosList: MusicVideoInfo[];
  isAdmin: boolean;
  currentUserId: string;
}

export function MusicProvider({
  children,
  musicVideosList,
  isAdmin,
  currentUserId,
}: MusicProviderProps) {
  return (
    <MusicContext.Provider value={{ musicVideosList, isAdmin, currentUserId }}>
      {children}
    </MusicContext.Provider>
  );
}
