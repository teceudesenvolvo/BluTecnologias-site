import type { User } from 'firebase/auth';
import { auth, signInWithEmailAndPassword, signOut } from '../../services/firebase';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { BluUser } from '../types';
import type { AuthRepository } from './AuthRepository';

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
