import { collection, getDocs, limit, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, ensureNoDuplicateRecord } from '../../services/firebase';
import type { PartnerSignupInput } from '../repositories/AuthRepository';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

export type PartnerRecord = {
  id: string;
  partnerId?: string;
  companyId?: string;
  type?: 'pf' | 'pj' | 'revendedor';
  referralCode?: string;
  name?: string;
  email?: string;
  phone?: string;
  document?: string;
  birthDate?: string;
  companyName?: string;
  legalName?: string;
  tradeName?: string;
  segment?: string;
  city?: string;
  state?: string;
  website?: string;
  bankName?: string;
  agency?: string;
  accountNumber?: string;
  pixKey?: string;
  pixType?: string;
  gatewayFeePercent?: number;
  taxPercent?: number;
  partnerCode?: string;
  status?: string;
  acceptTerms?: boolean;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
};

const nowIso = () => new Date().toISOString();

const partnerRef = (partnerId: string) => doc(db, 'partners', partnerId);

const memberRecord = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');
  const snapshot = await getDocs(query(collection(db, 'partnerUsers'), where('userId', '==', user.uid), limit(1)));
  const record = snapshot.docs[0]?.data() as PartnerRecord | undefined;
  if (!record) return null;
  const partnerId = String(record.partnerId || record.companyId || `partner-${user.uid}`);
  const partnerDoc = await getDoc(partnerRef(partnerId)).catch(() => null);
  return {
    ...record,
    id: partnerId,
    partnerId,
    companyId: partnerId,
    ...(partnerDoc?.exists() ? partnerDoc.data() : {}),
  } as PartnerRecord;
};

export const partnerService = {
  async current() {
    const record = await memberRecord();
    if (!record) throw new Error('Parceiro não encontrado.');
    return record;
  },
  async list() {
    const snapshot = await getDocs(collection(db, 'partners'));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as PartnerRecord[];
  },
  buildSalesLink(referralCode: string) {
    const code = referralCode.trim();
    return `${window.location.origin}${window.location.pathname}#/admin/onboarding?ref=${encodeURIComponent(code)}`;
  },
  async register(input: PartnerSignupInput) {
    await ensureNoDuplicateRecord('partners', {
      cnpj: input.company.document || input.user.document || '',
      cpf: input.partnerType === 'pf' ? (input.user.document || '') : '',
      email: input.user.email,
      phone: input.user.phone || '',
      companyName: input.company.tradeName || input.company.legalName || '',
      legalName: input.company.legalName || '',
      tradeName: input.company.tradeName || '',
    }, { scope: 'global' });
    const credential = await createUserWithEmailAndPassword(auth, input.user.email, input.user.password);
    await updateProfile(credential.user, { displayName: input.user.name });
    const partnerId = `partner-${credential.user.uid}`;
    const referralCode = `BLU-${credential.user.uid.slice(0, 8).toUpperCase()}`;
    const partnerPayload: PartnerRecord = {
      id: partnerId,
      partnerId,
      companyId: partnerId,
      type: input.partnerType,
      referralCode,
      name: input.user.name,
      email: input.user.email,
      phone: input.user.phone || '',
      document: input.user.document || input.company.document || '',
      birthDate: input.user.birthDate || '',
      companyName: input.company.tradeName || input.company.legalName || '',
      legalName: input.company.legalName || input.company.tradeName || '',
      tradeName: input.company.tradeName || input.company.legalName || '',
      segment: input.company.segment || '',
      city: input.company.city || '',
      state: input.company.state || '',
      website: input.company.website || '',
      bankName: input.financial.bankName || '',
      agency: input.financial.agency || '',
      accountNumber: input.financial.accountNumber || '',
      pixKey: input.financial.pixKey || '',
      pixType: input.financial.pixType || '',
      gatewayFeePercent: input.paymentProfile?.gatewayFeePercent ?? 0,
      taxPercent: input.paymentProfile?.taxPercent ?? 10,
      partnerCode: input.partnerCode || '',
      status: 'active',
      acceptTerms: input.acceptTerms,
      userId: credential.user.uid,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await Promise.all([
      setDoc(partnerRef(partnerId), partnerPayload, { merge: true }),
      setDoc(doc(db, 'partnerUsers', `${partnerId}_${credential.user.uid}`), {
        id: `${partnerId}_${credential.user.uid}`,
        partnerId,
        companyId: partnerId,
        userId: credential.user.uid,
        name: input.user.name,
        email: input.user.email,
        phone: input.user.phone || '',
        role: 'Parceiro',
        status: 'active',
        referralCode,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }, { merge: true }),
      setDoc(doc(db, 'partnerApplications', partnerId), {
        ...partnerPayload,
        user: {
          id: credential.user.uid,
          name: input.user.name,
          email: input.user.email,
          phone: input.user.phone || '',
        },
        financial: input.financial,
      }, { merge: true }),
    ]);
    return {
      ...partnerPayload,
      userId: credential.user.uid,
    };
  },
};
