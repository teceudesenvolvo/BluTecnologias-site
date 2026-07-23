import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

export type SupportTicketStatus = 'open' | 'waiting_support' | 'waiting_customer' | 'resolved';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type SupportTicketCategory = 'support' | 'billing' | 'technical' | 'suggestion' | 'training' | 'sac';

export type SupportTicket = {
  id: string;
  companyId: string;
  createdBy: string;
  requesterName: string;
  requesterEmail: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  description: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

export type SupportMessage = {
  id: string;
  ticketId: string;
  companyId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorType: 'customer' | 'support';
  body: string;
  createdAt: string;
};

export type NewSupportTicket = Pick<SupportTicket, 'subject' | 'category' | 'priority' | 'description'> & {
  requesterName: string;
  requesterEmail: string;
};

const now = () => new Date().toISOString();
const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const owner = () => {
  const firebaseUser = auth.currentUser;
  let localUser: any = null;
  try { localUser = JSON.parse(localStorage.getItem('blu-licita:user') || 'null'); } catch {}
  const userId = firebaseUser?.uid || localUser?.id || 'local-user';
  const companyId = localUser?.companyId || (firebaseUser ? `company-${firebaseUser.uid}` : 'local-company');
  const name = firebaseUser?.displayName || localUser?.name || localUser?.email?.split('@')[0] || 'Usuário Blu';
  const email = firebaseUser?.email || localUser?.email || '';
  return { userId, companyId, name, email };
};

export const supportService = {
  async list() {
    const user = owner();
    const [ticketsSnapshot, messagesSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'supportTickets'), where('companyId', '==', user.companyId))),
      getDocs(query(collection(db, 'supportMessages'), where('companyId', '==', user.companyId))),
    ]);
    const tickets = ticketsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as SupportTicket)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const messages = messagesSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as SupportMessage)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { tickets, messages };
  },
  async createTicket(value: NewSupportTicket) {
    const user = owner();
    const stamp = now();
    const ticket: Omit<SupportTicket, 'id'> = {
      ...value,
      companyId: user.companyId,
      createdBy: user.userId,
      requesterName: value.requesterName || user.name,
      requesterEmail: value.requesterEmail || user.email,
      status: 'open',
      lastMessageAt: stamp,
      createdAt: stamp,
      updatedAt: stamp,
    };
    const initialMessage: Omit<SupportMessage, 'id'> = {
      ticketId: '',
      companyId: user.companyId,
      authorId: user.userId,
      authorName: value.requesterName || user.name,
      authorEmail: value.requesterEmail || user.email,
      authorType: 'customer',
      body: value.description,
      createdAt: stamp,
    };
    const ticketRef = await addDoc(collection(db, 'supportTickets'), clean(ticket));
    await addDoc(collection(db, 'supportMessages'), clean({ ...initialMessage, ticketId: ticketRef.id }));
    return ticketRef.id;
  },
  async sendMessage(ticket: SupportTicket, body: string) {
    const user = owner();
    const stamp = now();
    const message: Omit<SupportMessage, 'id'> = {
      ticketId: ticket.id,
      companyId: user.companyId,
      authorId: user.userId,
      authorName: user.name,
      authorEmail: user.email,
      authorType: user.email === 'admin@blutecnologias.com.br' ? 'support' : 'customer',
      body,
      createdAt: stamp,
    };
    const nextStatus: SupportTicketStatus = message.authorType === 'support' ? 'waiting_customer' : 'waiting_support';
    await addDoc(collection(db, 'supportMessages'), clean(message));
    await updateDoc(doc(db, 'supportTickets', ticket.id), { status: nextStatus, lastMessageAt: stamp, updatedAt: stamp });
  },
  async updateStatus(ticket: SupportTicket, status: SupportTicketStatus) {
    const user = owner();
    const stamp = now();
    await updateDoc(doc(db, 'supportTickets', ticket.id), { status, updatedAt: stamp });
  },
};
