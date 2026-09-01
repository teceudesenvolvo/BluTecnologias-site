import React from 'react';
import { useBluAuth } from './BluAuthContext';
import type { CompanyMembership } from '../domain/companyAccess';

type AccountantCompanyContextValue = {
  company: CompanyMembership | null;
  competence: string;
  permissions: CompanyMembership['permissions'];
  companies: CompanyMembership[];
  setCompetence(value: string): void;
  selectCompany(companyId: string): Promise<void>;
};

const Context = React.createContext<AccountantCompanyContextValue | null>(null);
const localCompetence = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; };

export const AccountantCompanyProvider: React.FC<React.PropsWithChildren> = ({children}) => {
  const {user, memberships, switchCompany} = useBluAuth();
  const storageKey = `blu:accountant:competence:${user?.id || 'anonymous'}`;
  const [competence, setCompetenceState] = React.useState(() => localStorage.getItem(storageKey) || localCompetence());
  const company = memberships.find((item) => item.companyId === user?.companyId && item.status === 'active') || null;
  const setCompetence = (value: string) => { setCompetenceState(value); localStorage.setItem(storageKey, value); window.dispatchEvent(new CustomEvent('blu:accountant-context-changed', {detail: {companyId: company?.companyId, competence: value}})); };
  const selectCompany = async (companyId: string) => {
    await switchCompany(companyId);
    const recentKey = `blu:accountant:recent:${user?.id || 'anonymous'}`;
    const previous = JSON.parse(localStorage.getItem(recentKey) || '[]') as string[];
    localStorage.setItem(recentKey, JSON.stringify([companyId, ...previous.filter((item) => item !== companyId)].slice(0, 8)));
    window.dispatchEvent(new CustomEvent('blu:accountant-context-changed', {detail: {companyId, competence}}));
  };
  const value = React.useMemo(() => ({company, competence, permissions: company?.permissions || {}, companies: memberships.filter((item) => item.status === 'active'), setCompetence, selectCompany}), [company, competence, memberships]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useAccountantCompany = () => {
  const context = React.useContext(Context);
  if (!context) throw new Error('useAccountantCompany deve ser usado dentro de AccountantCompanyProvider');
  return context;
};
