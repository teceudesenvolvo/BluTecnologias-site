import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { auth, db, type Company, type FinancialSettings } from './firebase';

const owner = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');
  const ownCompanyId = `company-${user.uid}`;
  let companyId = ownCompanyId;
  try {
    companyId = JSON.parse(localStorage.getItem('blu-licita:user') || 'null')?.companyId || companyId;
  } catch {}
  return { user, companyId, ownCompanyId };
};

const clean = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const candidateCompanyIds = (userId: string, companyId: string) =>
  Array.from(new Set([companyId, `company-${userId}`].filter(Boolean)));

const safeGetDocs = async (q: ReturnType<typeof query>) => {
  try {
    return (await getDocs(q)).docs;
  } catch {
    return [];
  }
};

const makeId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

export const companySettingsService = {
  async getSettingsCompanies(): Promise<Company[]> {
    const { user, companyId, ownCompanyId } = owner();
    const ids = candidateCompanyIds(user.uid, companyId)
      .concat(ownCompanyId)
      .filter((value, index, list) => list.indexOf(value) === index);
    for (const candidateId of ids) {
      try {
        const snapshot = await getDoc(doc(db, 'companies', candidateId, 'settings', 'legalEntities'));
        if (snapshot.exists()) {
          return ((snapshot.data().companies || []) as Company[]).filter(Boolean);
        }
      } catch {
        // Continua tentando os demais vínculos possíveis do usuário.
      }
    }
    return [];
  },
  async saveSettingsCompanies(companies: Company[]) {
    const { user, companyId, ownCompanyId } = owner();
    const ids = candidateCompanyIds(user.uid, companyId)
      .concat(ownCompanyId)
      .filter((value, index, list) => list.indexOf(value) === index);
    let lastError: unknown = null;
    for (const candidateId of ids) {
      try {
        await setDoc(doc(db, 'companies', candidateId, 'settings', 'legalEntities'), clean({
          companies,
          updatedBy: user.uid,
          updatedAt: new Date().toISOString(),
        }), { merge: true });
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Não foi possível salvar as empresas.');
  },
  async getAll(): Promise<Company[]> {
    const { user, companyId, ownCompanyId } = owner();
    const settingsCompanies = await this.getSettingsCompanies();
    if (settingsCompanies.length) return settingsCompanies;

    const byCompany = await Promise.all(
      candidateCompanyIds(user.uid, companyId).concat(ownCompanyId).filter((value, index, list) => list.indexOf(value) === index).map(candidateId =>
        safeGetDocs(query(collection(db, 'legalEntities'), where('companyId', '==', candidateId)))
      )
    );
    const docs = byCompany.flat();
    const values = docs.map(item => ({ id: item.id, ...item.data() } as Company & { migratedFrom?: string }));
    const ids = new Set(values.map(item => item.id));
    const unique = new Map(
      values
        .filter(item => !(item.migratedFrom && ids.has(item.migratedFrom)))
        .map(item => [item.id, item as Company])
    );
    return Array.from(unique.values());
  },
  async create(value: Omit<Company, 'id'>) {
    const { user, companyId } = owner();
    const companies = await this.getAll();
    const newCompany = clean({
      ...value,
      id: makeId(),
      companyId,
      userId: user.uid,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
    } as Company);
    await this.saveSettingsCompanies([...companies, newCompany]);
    return { id: newCompany.id };
  },
  async update(id: string, value: Partial<Company>) {
    const { user } = owner();
    const { id: _id, ...payload } = value as Partial<Company> & { id?: string; userId?: string; companyId?: string };
    const companies = await this.getAll();
    const current = companies.find(company => company.id === id);
    const updated = clean({
      ...(current || {}),
      ...payload,
      id,
      updatedBy: user.uid,
      updatedAt: new Date().toISOString(),
    } as Company);
    await this.saveSettingsCompanies(current
      ? companies.map(company => company.id === id ? updated : company)
      : [...companies, updated]
    );
  },
  async delete(id: string) {
    const companies = await this.getAll();
    await this.saveSettingsCompanies(companies.filter(company => company.id !== id));
  },
};

export const financialSettingsService = {
  async get(): Promise<FinancialSettings | null> {
    const { companyId } = owner();
    const snapshot = await getDocs(query(collection(db, 'financialSettings'), where('companyId', '==', companyId)));
    const item = snapshot.docs[0];
    return item ? (item.data() as FinancialSettings) : null;
  },
  async save(value: FinancialSettings) {
    const { user, companyId } = owner();
    await setDoc(doc(db, 'financialSettings', companyId), clean({ ...value, companyId, createdBy: user.uid }), { merge: true });
  },
};

export interface SmtpSettings { host?: string; port?: number | string; user?: string; password?: string; secure?: boolean; }

export const userSettingsService = {
  async getSmtp(): Promise<SmtpSettings | null> {
    const { user } = owner();
    const snapshot = await getDoc(doc(db, 'users', user.uid, 'settings', 'smtp'));
    return snapshot.exists() ? snapshot.data() as SmtpSettings : null;
  },
  async saveSmtp(value: SmtpSettings) {
    const { user } = owner();
    await setDoc(doc(db, 'users', user.uid, 'settings', 'smtp'), clean(value), { merge: true });
  },
  async updateProfile(value: Record<string, unknown>) {
    const { user } = owner();
    await setDoc(doc(db, 'users', user.uid), clean(value), { merge: true });
  },
};
