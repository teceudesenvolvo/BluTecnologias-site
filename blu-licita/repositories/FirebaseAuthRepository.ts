import type { User } from 'firebase/auth';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, signInWithEmailAndPassword, signOut } from '../../services/firebase';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { BluUser } from '../types';
import type { AuthRepository, TrialSignupInput } from './AuthRepository';

const toBluUser = async (user: User): Promise<BluUser> => {
  const memberships = await getDocs(query(collection(db, 'companyUsers'), where('userId', '==', user.uid), limit(1)));
  const membership = memberships.docs[0]?.data();
  const companyId = membership?.companyId || `company-${user.uid}`;
  const company = await getDoc(doc(db, 'companies', companyId)).catch(() => null);
  return { id: user.uid, name: user.displayName || user.email?.split('@')[0] || 'Usuário Blu', email: user.email || '', role: membership?.role || 'Administrador', companyId, companyName: company?.exists() ? company.data().name || 'Minha empresa' : 'Minha empresa' };
};

export class FirebaseAuthRepository implements AuthRepository {
  async signIn(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return await toBluUser(credential.user);
  }

  async createTrialAccount(input: TrialSignupInput): Promise<BluUser> {
    const credential = await createUserWithEmailAndPassword(auth, input.user.email, input.user.password);
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
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
      ownerUserId: credential.user.uid,
      subscriptionId,
      accessStatus: 'TRIALING',
      onboardingGoals: input.goals || [],
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
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const subscriptionPayload = {
      id: subscriptionId,
      customerCompanyId: companyId,
      planId: input.plan,
      status: 'TRIALING',
      provider: 'infinitepay',
      trialStartedAt: now.toISOString(),
      trialEndsAt: trialEndsAt.toISOString(),
      currentPeriodStartedAt: now.toISOString(),
      currentPeriodEndsAt: trialEndsAt.toISOString(),
      nextBillingDate: trialEndsAt.toISOString(),
      gracePeriodEndsAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await Promise.all([
      setDoc(doc(db, 'companies', companyId), companyPayload, { merge: true }),
      setDoc(doc(db, 'companyUsers', membershipPayload.id), membershipPayload, { merge: true }),
      setDoc(doc(db, 'subscriptions', subscriptionId), subscriptionPayload, { merge: true }),
      setDoc(doc(db, 'companies', companyId, 'settings', 'subscription'), { plan: input.plan, status: 'trial', updatedAt: now.toISOString(), updatedBy: credential.user.uid }, { merge: true }),
    ]).catch(() => undefined);

    return {
      id: credential.user.uid,
      name: displayName,
      email: input.user.email,
      role: 'Administrador',
      companyId,
      companyName: companyPayload.name,
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
    };
  }

  async signOut() {
    if (auth.currentUser) await signOut(auth);
  }
}
