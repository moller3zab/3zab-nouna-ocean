import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import app from '../lib/firebase';
import { startPushOutbox } from '../lib/pushEvents';
import { syncPushIdentity } from '../lib/push';
import { isAllowedUser, MEMBER_IDENTITIES } from '../config/access';
import type { Identity } from '../types';

interface IdentityContextType {
  uid: string | null;
  identity: Identity;
  setIdentity: (identity: Identity) => void;
  toggleIdentity: () => void;
  isUnlocked: boolean;
  authLoading: boolean;
  logout: () => Promise<void>;
}
const IdentityContext = createContext<IdentityContextType | undefined>(undefined);
export const IdentityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [identity, setIdentityState] = useState<Identity>(() => localStorage.getItem('3zab_nouna_active_user') === 'Nouna' ? 'Nouna' : '3zab');
  const [uid, setUid] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => startPushOutbox(), []);
  useEffect(() => onAuthStateChanged(getAuth(app), (user) => {
    const allowedUid = user && isAllowedUser(user.uid) ? user.uid : null;
    setUid(allowedUid);
    if (allowedUid) setIdentityState(MEMBER_IDENTITIES[allowedUid]);
    void syncPushIdentity(allowedUid).catch(() => {});
    setIsUnlocked(Boolean(allowedUid));
    setAuthLoading(false);
    if (user && !isAllowedUser(user.uid)) void signOut(getAuth(app));
  }), []);
  const setIdentity = (id: Identity) => {
    setIdentityState(id);
    localStorage.setItem('3zab_nouna_active_user', id);
  };
  const toggleIdentity = () => setIdentity(identity === '3zab' ? 'Nouna' : '3zab');
  const logout = async () => {
    // Fail closed if a subscribed device cannot detach from the account.
    try {
      if (location.origin === 'https://ahmedwanfal.web.app') await syncPushIdentity(null);
    } catch {
      window.alert('Sign out could not detach notifications. Reconnect and try again before sharing this device.');
      return;
    }
    await signOut(getAuth(app));
  };
  return <IdentityContext.Provider value={{ uid, identity, setIdentity, toggleIdentity, isUnlocked, authLoading, logout }}>{children}</IdentityContext.Provider>;
};
export const useIdentity = () => {
  const context = useContext(IdentityContext);
  if (!context) throw new Error('useIdentity must be used within IdentityProvider');
  return context;
};
