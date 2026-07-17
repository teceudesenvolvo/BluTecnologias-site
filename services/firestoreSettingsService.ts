import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db, type Company, type FinancialSettings } from './firebase';

const owner = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');
  return { user, companyId: `company-${user.uid}` };
};

const clean = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const companySettingsService = {
  async getAll(): Promise<Company[]> {
    const { companyId } = owner();
    const snapshot = await getDocs(query(collection(db, 'legalEntities'), where('companyId', '==', companyId)));
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Company));
  },
  async create(value: Omit<Company, 'id'>) {
    const { user, companyId } = owner();
    return addDoc(collection(db, 'legalEntities'), clean({ ...value, companyId, createdBy: user.uid }));
  },
  async update(id: string, value: Partial<Company>) {
    await updateDoc(doc(db, 'legalEntities', id), clean(value));
  },
  async delete(id: string) {
    await deleteDoc(doc(db, 'legalEntities', id));
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
