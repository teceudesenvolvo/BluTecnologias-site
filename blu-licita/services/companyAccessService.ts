import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db, functions } from '../../services/firebase';
import type { AccountantIdentity, CompanyMembership, CompanyPermissionMap, MembershipStatus } from '../domain/companyAccess';

const call = <T, R>(name: string, payload: T) => httpsCallable<T, R>(functions, name)(payload).then((result) => result.data);

export const companyAccessService = {
  async listMyMemberships(userId: string): Promise<CompanyMembership[]> {
    if (!userId) return [];
    const [snapshot, legacy] = await Promise.all([
      getDocs(query(collection(db, 'companyMemberships'), where('userId', '==', userId))).catch(() => ({ docs: [] as any[] })),
      getDocs(query(collection(db, 'companyUsers'), where('userId', '==', userId))).catch(() => ({ docs: [] as any[] })),
    ]);
    const byCompany = new Map<string, CompanyMembership>();
    snapshot.docs.map((item: any) => ({ id: item.id, ...item.data() } as CompanyMembership)).filter((item) => item.status === 'active').forEach((item) => byCompany.set(item.companyId, item));
    await Promise.all(legacy.docs.map(async (item: any) => {
      const value = item.data(); if (byCompany.has(value.companyId) || value.status === 'revoked' || value.status === 'suspended') return;
      const company = await getDoc(doc(db, 'companies', value.companyId)).catch(() => null); const companyValue = company?.exists() ? company.data() : {};
      byCompany.set(value.companyId, { id: item.id, userId, companyId: value.companyId, companyName: String(companyValue?.tradeName || companyValue?.name || companyValue?.legalName || 'Empresa'), companyDocument: String(companyValue?.document || companyValue?.cnpj || ''), role: value.role || 'Membro', status: 'active', permissions: value.permissions || {} });
    }));
    return [...byCompany.values()].sort((a, b) => a.companyName.localeCompare(b.companyName, 'pt-BR'));
  },
  listManagedCompanies: () => call<Record<string, never>, { companies: Array<{ id: string; name: string; document?: string; accountId?: string }> }>('listManagedCompanies', {}).then((value) => value.companies),
  findAccountant: (email: string) => call<{ email: string }, { exists: boolean; identity?: Partial<AccountantIdentity> }>('findGlobalProfessional', { email }),
  linkAccountant: (identity: AccountantIdentity, links: Array<{ companyId: string; permissions: CompanyPermissionMap }>) =>
    call('linkAccountantToCompanies', { identity, links }),
  updateMembership: (membershipId: string, status: MembershipStatus, permissions?: CompanyPermissionMap) =>
    call('manageCompanyMembership', { membershipId, status, permissions }),
};
