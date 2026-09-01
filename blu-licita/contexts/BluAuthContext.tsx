import React, { createContext, useContext, useMemo, useState } from 'react';
import type { BluUser } from '../types';
import { authService } from '../services/authService';
import type { PartnerSignupInput, TrialSignupInput } from '../repositories/AuthRepository';
import type { CompanyMembership } from '../domain/companyAccess';
import { companyAccessService } from '../services/companyAccessService';

interface AuthContextValue {
  user: BluUser | null;
  memberships: CompanyMembership[];
  switchCompany(companyId: string): Promise<void>;
  refreshMemberships(): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signInDemo(): Promise<void>;
  createTrialAccount(input: TrialSignupInput): Promise<void>;
  createPartnerAccount(input: PartnerSignupInput): Promise<void>;
  signOut(): Promise<void>;
}

const storageKey = 'blu-licita:user';
const BluAuthContext = createContext<AuthContextValue | null>(null);

export const BluAuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<BluUser | null>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || 'null') as BluUser | null; }
    catch { return null; }
  });
  const [memberships, setMemberships] = useState<CompanyMembership[]>([]);

  const persist = (nextUser: BluUser | null) => {
    setUser(nextUser);
    if (nextUser) localStorage.setItem(storageKey, JSON.stringify(nextUser));
    else localStorage.removeItem(storageKey);
  };

  const refreshMemberships = async () => {
    if (!user?.id) { setMemberships([]); return; }
    const [linked, managed] = await Promise.all([
      companyAccessService.listMyMemberships(user.id).catch(() => []),
      companyAccessService.listManagedCompanies().catch(() => []),
    ]);
    const byCompany = new Map(linked.map((item) => [item.companyId, item]));
    managed.forEach((item) => {
      if (byCompany.has(item.id)) return;
      byCompany.set(item.id, {
        id: `managed-${item.id}`,
        userId: user.id,
        companyId: item.id,
        companyName: item.name,
        companyDocument: item.document,
        accountId: item.accountId,
        role: 'Administrador',
        status: 'active',
        permissions: {},
      });
    });
    if (user.companyId && !byCompany.has(user.companyId)) {
      byCompany.set(user.companyId, {
        id: `current-${user.companyId}`,
        userId: user.id,
        companyId: user.companyId,
        companyName: user.companyName || 'Minha empresa',
        role: user.role || 'Administrador',
        status: 'active',
        permissions: user.permissions || {},
      });
    }
    setMemberships([...byCompany.values()].sort((a, b) => a.companyName.localeCompare(b.companyName, 'pt-BR')));
  };

  React.useEffect(() => { void refreshMemberships(); }, [user?.id]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    memberships,
    refreshMemberships,
    switchCompany: async (companyId) => {
      const membership = memberships.find((item) => item.companyId === companyId && item.status === 'active');
      if (!user || !membership) throw new Error('Você não possui acesso ativo a esta empresa.');
      persist({ ...user, companyId: membership.companyId, companyName: membership.companyName, role: membership.role, membershipId: membership.id, membershipStatus: membership.status, permissions: membership.permissions });
      window.dispatchEvent(new CustomEvent('blu:company-changed', { detail: { companyId } }));
    },
    signIn: async (email, password) => persist(await authService.signIn(email, password)),
    signInDemo: async () => persist(await authService.signInDemo()),
    createTrialAccount: async (input) => persist(await authService.createTrialAccount(input)),
    createPartnerAccount: async (input) => persist(await authService.createPartnerAccount(input)),
    signOut: async () => { await authService.signOut(); persist(null); },
  }), [user, memberships]);

  return <BluAuthContext.Provider value={value}>{children}</BluAuthContext.Provider>;
};

export const useBluAuth = () => {
  const context = useContext(BluAuthContext);
  if (!context) throw new Error('useBluAuth deve ser usado dentro de BluAuthProvider');
  return context;
};

export const useOptionalBluAuth = () => useContext(BluAuthContext);
