import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

export type TaxObligation={id:string;name:string;category:'federal'|'estadual'|'municipal'|'trabalhista';period:string;dueDate:string;amount:number;status:'pending'|'paid'|'overdue';company:string;notes?:string;paidAt?:string};
const owner=()=>{const user=auth.currentUser;if(!user)throw new Error('Usuário não autenticado.');return{companyId:`company-${user.uid}`,createdBy:user.uid}};
const clean=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
export const taxService={
  async list():Promise<TaxObligation[]>{const{companyId}=owner();const snapshot=await getDocs(query(collection(db,'taxObligations'),where('companyId','==',companyId)));return snapshot.docs.map(item=>({id:item.id,...item.data()} as TaxObligation)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))},
  async create(value:Omit<TaxObligation,'id'>){await addDoc(collection(db,'taxObligations'),clean({...value,...owner()}))},
  async update(id:string,value:Partial<TaxObligation>){await updateDoc(doc(db,'taxObligations',id),clean(value))},
  async delete(id:string){await deleteDoc(doc(db,'taxObligations',id))},
};
