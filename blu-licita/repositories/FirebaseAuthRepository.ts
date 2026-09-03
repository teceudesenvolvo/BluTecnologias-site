import type { User } from 'firebase/auth';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, signInWithEmailAndPassword, signOut } from '../../services/firebase';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { db, ensureNoDuplicateRecord } from '../../services/firebase';
import type { BluUser } from '../types';
import type { AuthRepository, PartnerSignupInput, TrialSignupInput } from './AuthRepository';
import { defaultPublicPlans } from '../services/publicPlanCatalog';

const toBluUser = async (user: User): Promise<BluUser> => {
  const contextualMemberships = await getDocs(query(collection(db, 'companyMemberships'), where('userId', '==', user.uid))).catch(() => ({ docs: [] as any[] }));
  const activeContextual = contextualMemberships.docs.map((item: any) => ({ id: item.id, ...item.data() })).filter((item: any) => item.status === 'active');
  let rememberedCompanyId = '';
  try { rememberedCompanyId = JSON.parse(localStorage.getItem('blu-licita:user') || 'null')?.companyId || ''; } catch {}
  const contextual = activeContextual.find((item: any) => item.companyId === rememberedCompanyId) || activeContextual[0];
  const memberships = await getDocs(query(collection(db, 'companyUsers'), where('userId', '==', user.uid), limit(20)));
  const membershipDoc = memberships.docs.find((item) => item.data().companyId === rememberedCompanyId) || memberships.docs[0];
  const membership = contextual || membershipDoc?.data();
  const partners = await getDocs(query(collection(db, 'partnerUsers'), where('userId', '==', user.uid), limit(1))).catch(() => ({ docs: [] as any[] }));
  const partnerMembership = partners.docs[0]?.data();
  const userProfile = await getDoc(doc(db, 'users', user.uid)).catch(() => null);
  const userProfileData = userProfile?.exists() ? userProfile.data() : null;
  if (partnerMembership) {
    const partnerCompany = await getDoc(doc(db, 'partners', partnerMembership.partnerId || partnerMembership.companyId || `partner-${user.uid}`)).catch(() => null);
    const partnerData = partnerCompany?.exists() ? partnerCompany.data() : null;
    return {
      id: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Parceiro Blu',
      email: user.email || '',
      role: partnerMembership.role || 'Parceiro',
      companyId: String(partnerMembership.partnerId || partnerMembership.companyId || `partner-${user.uid}`),
      companyName: String(partnerData?.companyName || partnerData?.tradeName || partnerData?.legalName || 'Portal do Parceiro'),
      billingCompanyId: String(userProfileData?.billingCompanyId || userProfileData?.primaryBillingCompanyId || partnerMembership.partnerId || partnerMembership.companyId || `partner-${user.uid}`),
    };
  }
  const companyId = membership?.companyId || `company-${user.uid}`;
  const company = await getDoc(doc(db, 'companies', companyId)).catch(() => null);
  return {
    id: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Usuário Blu',
    email: user.email || '',
    role: membership?.role || 'Administrador',
    companyId,
    companyName: company?.exists() ? company.data().name || 'Minha empresa' : 'Minha empresa',
    billingCompanyId: String(userProfileData?.billingCompanyId || userProfileData?.primaryBillingCompanyId || companyId),
    membershipId: contextual?.id || membershipDoc?.id,
    membershipStatus: contextual?.status || membership?.status || 'active',
    permissions: contextual?.permissions || membership?.permissions || {},
  };
};

export class FirebaseAuthRepository implements AuthRepository {
  async signIn(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return await toBluUser(credential.user);
  }

  async createTrialAccount(input: TrialSignupInput): Promise<BluUser> {
    await ensureNoDuplicateRecord('companies', {
      cnpj: input.company.document,
      email: input.user.email,
      phone: input.user.phone || '',
      companyName: input.company.tradeName || input.company.legalName,
      legalName: input.company.legalName,
      tradeName: input.company.tradeName,
    }, { scope: 'global' });
    const credential = await createUserWithEmailAndPassword(auth, input.user.email, input.user.password);
    const now = new Date();
    const configuredPlan = await getDoc(doc(db, 'plans', input.plan)).catch(() => null);
    const fallbackPlan = defaultPublicPlans().find((item) => item.id === input.plan || item.slug === input.plan) || null;
    const planData = configuredPlan?.exists() ? configuredPlan.data() as Record<string, any> : fallbackPlan;
    const planPriceInCents = Number(planData?.priceInCents || 0);
    const isFreePlan = planPriceInCents <= 0;
    const trialDays = isFreePlan ? 0 : input.plan === 'test-1-real' ? 0 : Number(planData?.trialDays ?? 7);
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    const subscriptionStatus = isFreePlan ? 'ACTIVE' : input.plan === 'test-1-real' ? 'PAYMENT_PENDING' : trialDays > 0 ? 'TRIALING' : 'PAYMENT_PENDING';
    const displayName = input.user.name.trim() || input.user.email.split('@')[0];
    const companyId = `company-${credential.user.uid}`;
    const subscriptionId = `sub-${companyId}`;

    await updateProfile(credential.user, { displayName }).catch(() => undefined);

    const companyPayload = {
      id: companyId,
      name: input.company.tradeName || input.company.legalName,
      legalName: input.company.legalName,
      tradeName: input.company.tradeName || input.company.legalName,
      document: input.company.document,
      segment: input.company.segment || '',
      city: input.company.city || '',
      state: input.company.state || '',
      email: input.company.email || input.user.email,
      phone: input.company.phone || input.user.phone || '',
      cep: input.company.cep || '',
      logradouro: input.company.street || '',
      numero: input.company.number || '',
      complemento: input.company.complement || '',
      bairro: input.company.neighborhood || '',
      ownerUserId: credential.user.uid,
      ownerCompanyId: companyId,
      subscriptionId,
      accessStatus: subscriptionStatus,
      onboardingGoals: input.goals || [],
      referredByPartnerCode: input.partnerCode || '',
      customerReferralCode: input.customerReferralCode || '',
      createdBy: credential.user.uid,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const membershipPayload = {
      id: `${companyId}_${credential.user.uid}`,
      companyId,
      userId: credential.user.uid,
      name: displayName,
      email: input.user.email,
      phone: input.user.phone || '',
      role: 'Administrador',
      status: 'active',
      createdBy: credential.user.uid,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const platformCustomerPayload = {
      id: companyId,
      companyId,
      userId: credential.user.uid,
      user: {
        id: credential.user.uid,
        name: displayName,
        email: input.user.email,
        phone: input.user.phone || '',
      },
      company: {
        ...companyPayload,
        companyId,
      },
      subscriptionId,
      planId: input.plan,
      status: isFreePlan ? 'active' : input.plan === 'test-1-real' ? 'payment_pending' : trialDays > 0 ? 'trial' : 'payment_pending',
      source: 'trial-signup',
      trialDays,
      trialStartedAt: now.toISOString(),
      trialEndsAt: trialEndsAt.toISOString(),
      accessStatus: subscriptionStatus,
      companyDocument: input.company.document,
      companyName: companyPayload.name,
      companyLegalName: companyPayload.legalName,
      companyTradeName: companyPayload.tradeName,
      companyEmail: companyPayload.email,
      companyPhone: companyPayload.phone,
      companyCep: companyPayload.cep,
      companyStreet: companyPayload.logradouro,
      companyNumber: companyPayload.numero,
      companyNeighborhood: companyPayload.bairro,
      ownerName: displayName,
      ownerEmail: input.user.email,
      ownerPhone: input.user.phone || '',
      goals: input.goals || [],
      referredByPartnerCode: input.partnerCode || '',
      createdBy: credential.user.uid,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const subscriptionPayload = {
      id: subscriptionId,
      customerCompanyId: companyId,
      planId: input.plan,
      status: subscriptionStatus,
      provider: 'pagarme',
      trialStartedAt: trialDays > 0 ? now.toISOString() : null,
      trialEndsAt: trialDays > 0 ? trialEndsAt.toISOString() : null,
      currentPeriodStartedAt: now.toISOString(),
      currentPeriodEndsAt: isFreePlan ? null : trialDays > 0 ? trialEndsAt.toISOString() : null,
      nextBillingDate: isFreePlan ? null : trialDays > 0 ? trialEndsAt.toISOString() : null,
      gracePeriodEndsAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await Promise.all([
      setDoc(doc(db, 'companies', companyId), companyPayload, { merge: true }),
      setDoc(doc(db, 'companyUsers', membershipPayload.id), membershipPayload, { merge: true }),
      setDoc(doc(db, 'companyMemberships', membershipPayload.id), { ...membershipPayload, companyName: companyPayload.name, companyDocument: companyPayload.document, permissions: { team: { manage: true } } }, { merge: true }),
      setDoc(doc(db, 'subscriptions', subscriptionId), subscriptionPayload, { merge: true }),
      setDoc(doc(db, 'platformCustomers', companyId), platformCustomerPayload, { merge: true }),
      setDoc(doc(db, 'companies', companyId, 'settings', 'subscription'), { plan: input.plan, status: isFreePlan ? 'active' : trialDays > 0 ? 'trial' : 'payment_pending', updatedAt: now.toISOString(), updatedBy: credential.user.uid }, { merge: true }),
    ]).catch(() => undefined);

    return {
      id: credential.user.uid,
      name: displayName,
      email: input.user.email,
      role: 'Administrador',
      companyId,
      companyName: companyPayload.name,
      billingCompanyId: companyId,
    };
  }

  async createPartnerAccount(input: PartnerSignupInput): Promise<BluUser> {
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
    const now = new Date();
    const displayName = input.user.name.trim() || input.user.email.split('@')[0];
    const partnerId = `partner-${credential.user.uid}`;
    const referralCode = `BLU-${credential.user.uid.slice(0, 8).toUpperCase()}`;

    await updateProfile(credential.user, { displayName }).catch(() => undefined);

    const partnerPayload = {
      id: partnerId,
      partnerId,
      companyId: partnerId,
      type: input.partnerType,
      referralCode,
      name: displayName,
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
      acceptTerms: input.acceptTerms,
      status: 'active',
      createdBy: credential.user.uid,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const partnerUserPayload = {
      id: `${partnerId}_${credential.user.uid}`,
      partnerId,
      companyId: partnerId,
      userId: credential.user.uid,
      name: displayName,
      email: input.user.email,
      phone: input.user.phone || '',
      role: 'Parceiro',
      status: 'active',
      referralCode,
      createdBy: credential.user.uid,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await Promise.all([
      setDoc(doc(db, 'partners', partnerId), partnerPayload, { merge: true }),
      setDoc(doc(db, 'partnerUsers', partnerUserPayload.id), partnerUserPayload, { merge: true }),
      setDoc(doc(db, 'partnerApplications', partnerId), {
        ...partnerPayload,
        id: partnerId,
        user: {
          id: credential.user.uid,
          name: displayName,
          email: input.user.email,
          phone: input.user.phone || '',
        },
        financial: {
          bankName: input.financial.bankName || '',
          agency: input.financial.agency || '',
          accountNumber: input.financial.accountNumber || '',
          pixKey: input.financial.pixKey || '',
          pixType: input.financial.pixType || '',
        },
        paymentProfile: {
          gatewayFeePercent: input.paymentProfile?.gatewayFeePercent ?? 0,
          taxPercent: input.paymentProfile?.taxPercent ?? 10,
        },
      }, { merge: true }),
      setDoc(doc(db, 'companyUsers', `${partnerId}_${credential.user.uid}`), {
        companyId: partnerId,
        userId: credential.user.uid,
        role: 'Parceiro',
        createdAt: now.toISOString(),
      }, { merge: true }),
    ]).catch(() => undefined);

    return {
      id: credential.user.uid,
      name: displayName,
      email: input.user.email,
      role: 'Parceiro',
      companyId: partnerId,
      companyName: partnerPayload.companyName || 'Portal do Parceiro Blu',
      billingCompanyId: partnerId,
    };
  }

  async signInDemo(): Promise<BluUser> {
    return {
      id: 'demo-user',
      name: 'Leonardo Ribeiro',
      email: 'demo@blu.com.br',
      role: 'Administrador',
      companyId: 'demo-company',
      companyName: 'Distribuidora Nordeste Ltda.',
      billingCompanyId: 'demo-company',
    };
  }

  async signOut() {
    if (auth.currentUser) await signOut(auth);
  }
}
