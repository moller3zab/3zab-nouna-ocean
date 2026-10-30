import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import app from '../lib/firebase';
import { isAllowedUser } from '../config/access';
import type { Identity } from '../types';

interface IdentityContextType {
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
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => onAuthStateChanged(getAuth(app), (user) => {
    setIsUnlocked(Boolean(user && isAllowedUser(user.uid)));
    setAuthLoading(false);
    if (user && !isAllowedUser(user.uid)) void signOut(getAuth(app));
  }), []);
  const setIdentity = (id: Identity) => {
    setIdentityState(id);
    localStorage.setItem('3zab_nouna_active_user', id);
  };
  const toggleIdentity = () => setIdentity(identity === '3zab' ? 'Nouna' : '3zab');
  const logout = () => signOut(getAuth(app));
  return <IdentityContext.Provider value={{ identity, setIdentity, toggleIdentity, isUnlocked, authLoading, logout }}>{children}</IdentityContext.Provider>;
};
export const useIdentity = () => {
  const context = useContext(IdentityContext);
  if (!context) throw new Error('useIdentity must be used within IdentityProvider');
  return context;
};
