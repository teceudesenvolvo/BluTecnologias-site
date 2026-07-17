import{collection,getDocs,query,where}from'firebase/firestore';import{httpsCallable}from'firebase/functions';import{db,functions}from'../../../services/firebase';import type{BankAccount,BankAccountInput,BankMovement,BankTransfer}from'../domain/bankAccountTypes';import type{BankAccountRepository,BankContext}from'../repositories/bankAccountRepository';
const docs=<T,>(snapshot:any)=>snapshot.docs.map((item:any)=>({id:item.id,...item.data()}as T));
export class FirebaseBankAccountAdapter implements BankAccountRepository{
 async list(context:BankContext){return docs<BankAccount>(await getDocs(query(collection(db,'bankAccounts'),where('companyId','==',context.companyId))))}
 async movements(context:BankContext,accountId?:string){const constraints:any[]=[where('companyId','==',context.companyId)];if(accountId)constraints.push(where('bankAccountId','==',accountId));return docs<BankMovement>(await getDocs(query(collection(db,'financialTransactions'),...constraints))).filter(x=>Boolean(x.bankAccountId)).sort((a,b)=>String(b.date).localeCompare(String(a.date)))}
 async save(_context:BankContext,value:BankAccountInput,id?:string){const call=httpsCallable(functions,'mutateBankAccount');const result=await call({action:id?'update':'create',id,value});return String((result.data as any).id)}
 async inactivate(_context:BankContext,id:string){const call=httpsCallable(functions,'mutateBankAccount');await call({action:'inactivate',id})}
 async transfer(_context:BankContext,value:BankTransfer){const call=httpsCallable(functions,'transferBetweenBankAccounts');const result=await call(value);return String((result.data as any).id)}
 async adjust(_context:BankContext,accountId:string,amountCents:number,date:string,reason:string){const call=httpsCallable(functions,'adjustBankAccountBalance');await call({accountId,amountCents,date,reason})}
}
