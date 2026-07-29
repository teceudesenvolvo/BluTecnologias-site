import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { emailTemplateAdminService } from './emailTemplateAdminService';

export type PlatformTeamMember = {
  id: string;
  companyId?: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  status: 'active' | 'invited' | 'inactive';
  scope?: 'platform';
  invitationId?: string;
  createdAt?: string;
  updatedAt?: string;
  acceptedAt?: string;
};

const platformCompanyId = 'blu-platform';
const memberDocId = (email: string) => `${platformCompanyId}_${email.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '_')}`;

export const platformTeamService = {
  async list() {
    const snapshot = await getDocs(query(collection(db, 'bluTeamMembers'), where('companyId', '==', platformCompanyId)));
    const members = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as PlatformTeamMember));
    const unique = new Map<string, PlatformTeamMember>();
    for (const member of members) {
      const key = String(member.email || '').trim().toLowerCase() || member.id;
      const existing = unique.get(key);
      if (!existing || (existing.status !== 'active' && member.status === 'active')) {
        unique.set(key, member);
      }
    }
    return [...unique.values()];
  },
  async invite(value: Omit<PlatformTeamMember, 'id' | 'status'>) {
    const now = new Date().toISOString();
    const invitation = await addDoc(collection(db, 'bluTeamInvitations'), {
      ...value,
      companyId: platformCompanyId,
      scope: 'platform',
      status: 'pending',
      createdAt: now,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    await setDoc(doc(db, 'bluTeamMembers', memberDocId(value.email)), {
      ...value,
      companyId: platformCompanyId,
      scope: 'platform',
      invitationId: invitation.id,
      status: 'invited',
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
    const link = `${window.location.origin}${window.location.pathname}#/admin/cadastro-membro?token=${invitation.id}&email=${encodeURIComponent(value.email)}&scope=platform`;
    const template = (await emailTemplateAdminService.list()).find((item) => item.key === 'platform_team_invite') || emailTemplateAdminService.defaults.platform_team_invite;
    const message = emailTemplateAdminService.render(template, {
      name: value.name,
      email: value.email,
      link,
    });
    await addDoc(collection(db, 'mail_queue'), {
      to: [value.email],
      userId: auth.currentUser?.uid,
      message,
    });
    return link;
  },
  async accept(token: string, name: string, email: string, password: string) {
    if (!token) throw new Error('Convite inválido.');
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    const invitationRef = doc(db, 'bluTeamInvitations', token);
    const invitation = await getDoc(invitationRef);
    const data = invitation.data();
    if (!invitation.exists() || !data) throw new Error('Convite inválido ou expirado.');
    if (String(data.email).toLowerCase() !== email.toLowerCase()) throw new Error('Use o mesmo e-mail que recebeu o convite.');
    if (data.status !== 'pending' || new Date(data.expiresAt).getTime() < Date.now()) throw new Error('Este convite expirou ou já foi utilizado.');
    const now = new Date().toISOString();
    await setDoc(doc(db, 'bluTeamMembers', memberDocId(email)), {
      name,
      email,
      phone: data.phone || '',
      role: data.role || 'Blu Team',
      department: data.department || 'Plataforma Blu',
      status: 'active',
      scope: 'platform',
      companyId: platformCompanyId,
      createdBy: data.createdBy,
      userId: credential.user.uid,
      invitationId: token,
      acceptedAt: now,
      updatedAt: now,
    }, { merge: true });
    await setDoc(doc(db, 'companyUsers', `${platformCompanyId}_${credential.user.uid}`), {
      companyId: platformCompanyId,
      userId: credential.user.uid,
      role: data.role || 'Blu Team',
      invitationId: token,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
    await setDoc(invitationRef, { status: 'accepted', acceptedBy: credential.user.uid, acceptedAt: now }, { merge: true });
    return credential.user;
  },
};
