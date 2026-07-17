import React, { createContext, useContext, useMemo, useState } from 'react';
import type { BluUser } from '../types';
import { authService } from '../services/authService';

interface AuthContextValue {
  user: BluUser | null;
  signIn(email: string, password: string): Promise<void>;
  signInDemo(): Promise<void>;
  signOut(): Promise<void>;
}

const storageKey = 'blu-licita:user';
const BluAuthContext = createContext<AuthContextValue | null>(null);

export const BluAuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<BluUser | null>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || 'null') as BluUser | null; }
    catch { return null; }
  });

  const persist = (nextUser: BluUser | null) => {
    setUser(nextUser);
    if (nextUser) localStorage.setItem(storageKey, JSON.stringify(nextUser));
    else localStorage.removeItem(storageKey);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    signIn: async (email, password) => persist(await authService.signIn(email, password)),
    signInDemo: async () => persist(await authService.signInDemo()),
    signOut: async () => { await authService.signOut(); persist(null); },
  }), [user]);

  return <BluAuthContext.Provider value={value}>{children}</BluAuthContext.Provider>;
};

export const useBluAuth = () => {
  const context = useContext(BluAuthContext);
  if (!context) throw new Error('useBluAuth deve ser usado dentro de BluAuthProvider');
  return context;
};
