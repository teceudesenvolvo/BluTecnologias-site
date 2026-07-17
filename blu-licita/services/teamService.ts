import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../../services/firebase';

export type TeamMember = { id: string; name: string; email: string; phone?: string; role: string; department?: string; status: 'active' | 'invited' };
const owner = () => { const user = auth.currentUser; if (!user) throw new Error('Usuário não autenticado.'); let companyId = `company-${user.uid}`; try { companyId = JSON.parse(localStorage.getItem('blu-licita:user') || 'null')?.companyId || companyId; } catch {} return { companyId, createdBy: user.uid }; };

export const teamService = {
  async list() {
    const { companyId } = owner();
    const snapshot = await getDocs(query(collection(db, 'teamMembers'), where('companyId', '==', companyId)));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as TeamMember));
  },
  async invite(value: Omit<TeamMember, 'id' | 'status'>) {
    const invitation = await addDoc(collection(db, 'teamInvitations'), { ...value, ...owner(), status: 'pending', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() });
    await addDoc(collection(db, 'teamMembers'), { ...value, ...owner(), invitationId: invitation.id, status: 'invited', createdAt: new Date().toISOString() });
    const link = `${window.location.origin}${window.location.pathname}#/admin/cadastro-membro?token=${invitation.id}`;
    await addDoc(collection(db, 'mail_queue'), { to: [value.email], userId: auth.currentUser?.uid, message: { subject: 'Convite para fazer parte da equipe Blu', text: `Você foi convidado para fazer parte da equipe na Blu. Acesse: ${link}`, html: `<p>Olá, ${value.name}.</p><p>Você foi convidado para fazer parte da equipe na Blu.</p><p><a href="${link}">Criar minha conta</a></p>` } });
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
    await setDoc(doc(db, 'teamMembers', `${data.companyId}_${credential.user.uid}`), { name, email, phone: data.phone || '', role: data.role || 'Analista', department: data.department || '', status: 'active', companyId: data.companyId, createdBy: data.createdBy, userId: credential.user.uid, invitationId: token, acceptedAt: new Date().toISOString() }, { merge: true });
    await setDoc(doc(db, 'companyUsers', `${data.companyId}_${credential.user.uid}`), { companyId: data.companyId, userId: credential.user.uid, role: data.role || 'Analista', invitationId: token, createdAt: new Date().toISOString() }, { merge: true });
    await setDoc(invitationRef, { status: 'accepted', acceptedBy: credential.user.uid, acceptedAt: new Date().toISOString() }, { merge: true });
    return credential.user;
  },
};
