import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db, ensureNoDuplicateRecord } from '../../services/firebase';
import { emailTemplateAdminService } from './emailTemplateAdminService';

export type TeamMember = { id: string; name: string; email: string; phone?: string; role: string; department?: string; status: 'active' | 'invited' };
const owner = () => { const user = auth.currentUser; if (!user) throw new Error('Usuário não autenticado.'); let companyId = `company-${user.uid}`; try { companyId = JSON.parse(localStorage.getItem('blu-licita:user') || 'null')?.companyId || companyId; } catch {} return { companyId, createdBy: user.uid }; };
const memberDocId = (companyId: string, email: string) => `${companyId}_${email.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '_')}`;

export const teamService = {
  async list() {
    const { companyId } = owner();
    const snapshot = await getDocs(query(collection(db, 'teamMembers'), where('companyId', '==', companyId)));
    const members = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as TeamMember));
    const unique = new Map<string, TeamMember>();
    for (const member of members) {
      const key = String(member.email || '').trim().toLowerCase() || member.id;
      const existing = unique.get(key);
      if (!existing || existing.status !== 'active' && member.status === 'active') {
        unique.set(key, member);
      }
    }
    return [...unique.values()];
  },
  async invite(value: Omit<TeamMember, 'id' | 'status'>) {
    await ensureNoDuplicateRecord('teamMembers', {
      email: value.email,
      phone: value.phone || '',
      name: value.name,
    }, { scope: 'company' });
    const now = new Date().toISOString();
    const invitation = await addDoc(collection(db, 'teamInvitations'), { ...value, ...owner(), status: 'pending', createdAt: now, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() });
    await setDoc(doc(db, 'teamMembers', memberDocId(owner().companyId, value.email)), { ...value, ...owner(), invitationId: invitation.id, status: 'invited', createdAt: now, updatedAt: now }, { merge: true });
    const link = `${window.location.origin}${window.location.pathname}#/admin/cadastro-membro?token=${invitation.id}&email=${encodeURIComponent(value.email)}`;
    const template = (await emailTemplateAdminService.list()).find((item) => item.key === 'team_invite') || emailTemplateAdminService.defaults.team_invite;
    const message = emailTemplateAdminService.render(template, {
      name: value.name,
      email: value.email,
      link,
    });
    await addDoc(collection(db, 'mail_queue'), { to: [value.email], userId: auth.currentUser?.uid, message });
    return link;
  },
  async accept(token: string, name: string, email: string, password: string) {
    if (!token) throw new Error('Convite inválido.');
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    const invitationRef = doc(db, 'teamInvitations', token);
    const invitation = await getDoc(invitationRef);
    if (!invitation.exists()) throw new Error('Convite inválido ou expirado.');
    const data = invitation.data();
    if (String(data.email).toLowerCase() !== email.toLowerCase()) throw new Error('Use o mesmo e-mail que recebeu o convite.');
    if (data.status !== 'pending' || new Date(data.expiresAt).getTime() < Date.now()) throw new Error('Este convite expirou ou já foi utilizado.');
    const now = new Date().toISOString();
    await setDoc(doc(db, 'teamMembers', memberDocId(data.companyId, email)), { name, email, phone: data.phone || '', role: data.role || 'Analista', department: data.department || '', status: 'active', companyId: data.companyId, createdBy: data.createdBy, userId: credential.user.uid, invitationId: token, acceptedAt: now, updatedAt: now }, { merge: true });
    await setDoc(doc(db, 'companyUsers', `${data.companyId}_${credential.user.uid}`), { companyId: data.companyId, userId: credential.user.uid, role: data.role || 'Analista', invitationId: token, createdAt: new Date().toISOString() }, { merge: true });
    await setDoc(invitationRef, { status: 'accepted', acceptedBy: credential.user.uid, acceptedAt: now }, { merge: true });
    return credential.user;
  },
};
