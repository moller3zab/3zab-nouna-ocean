import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { reportSync } from '../lib/store';

export interface ArchiveSettings {
  title?: string;
  subtitle?: string;
  relationshipStartedAt?: string;
  heroImageUrl?: string;
  videoUrl?: string;
  videoPosterUrl?: string;
  sanctuaryNote?: string;
}
const ArchiveContext = createContext<ArchiveSettings>({});
export function ArchiveProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ArchiveSettings>({});
  useEffect(() => {
    reportSync('settings', 'loading');
    return onSnapshot(doc(db, 'settings', 'site'), snapshot => {
      setSettings(snapshot.exists() ? snapshot.data() : {});
      reportSync('settings', 'ready');
    }, () => reportSync('settings', 'error', 'Your private archive could not be opened. Check access for your account, then retry.'));
  }, []);
  return <ArchiveContext.Provider value={settings}>{children}</ArchiveContext.Provider>;
}
export const useArchive = () => useContext(ArchiveContext);
export const saveArchive = (settings: ArchiveSettings) => setDoc(doc(db, 'settings', 'site'), settings, { merge: true });
