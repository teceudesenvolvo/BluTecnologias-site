import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
export type CrmBoard = { id: string; name: string; description?: string };
export type CrmColumn = { id: string; boardId: string; name: string; position: number };
export type CrmComment = { id: string; content: string; author: string; createdAt: string };
export type CrmCard = { id: string; boardId: string; columnId: string; title: string; description?: string; organization?: string; dueDate?: string; labels: string[]; comments?: CrmComment[]; position: number };
const owner = () => { const user = auth.currentUser; if (!user) throw new Error('Usuário não autenticado.'); let companyId = `company-${user.uid}`; try { companyId = JSON.parse(localStorage.getItem('blu-licita:user') || 'null')?.companyId || companyId; } catch {} return { companyId, createdBy: user.uid }; };
const list = async <T,>(name: string) => { const { companyId } = owner(); const snapshot = await getDocs(query(collection(db, name), where('companyId', '==', companyId))); return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T)); };
const create = (name: string, value: object) => addDoc(collection(db, name), { ...value, ...owner(), createdAt: new Date().toISOString() });
export const crmBoardService = {
  boards: () => list<CrmBoard>('crmBoards'), columns: () => list<CrmColumn>('crmColumns'), cards: () => list<CrmCard>('crmCards'),
  async createBoard(name: string, description = '') { const board = await create('crmBoards', { name, description }); for (const [position, columnName] of ['Novas oportunidades', 'Analisando', 'Participação', 'Contrato', 'Execução', 'Recebimento'].entries()) await create('crmColumns', { boardId: board.id, name: columnName, position }); },
  updateBoard: (id: string, value: Partial<CrmBoard>) => updateDoc(doc(db, 'crmBoards', id), { ...value, updatedAt: new Date().toISOString() }),
  createColumn: (boardId: string, name: string, position: number) => create('crmColumns', { boardId, name, position }),
  updateColumn: (id: string, name: string) => updateDoc(doc(db, 'crmColumns', id), { name, updatedAt: new Date().toISOString() }),
  deleteColumn: (id: string) => deleteDoc(doc(db, 'crmColumns', id)),
  createCard: (value: Omit<CrmCard, 'id' | 'position'>) => create('crmCards', { ...value, position: Date.now() }),
  updateCard: (id: string, value: Partial<CrmCard>) => updateDoc(doc(db, 'crmCards', id), { ...value, updatedAt: new Date().toISOString() }),
  moveCard: (id: string, columnId: string, position: number) => updateDoc(doc(db, 'crmCards', id), { columnId, position, updatedAt: new Date().toISOString() }),
  deleteCard: (id: string) => deleteDoc(doc(db, 'crmCards', id)),
};
