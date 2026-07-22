import React from 'react';
import { useBluAuth } from '../../contexts/BluAuthContext';
import { FirebaseCashFlowAdapter } from '../adapters/FirebaseCashFlowAdapter';
import type { CashFlowFilters, CashFlowInput, CashFlowTransaction } from '../domain/cashFlowTypes';
import { CashFlowService } from '../services/CashFlowService';
const service=new CashFlowService(new FirebaseCashFlowAdapter());
const month=()=>new Date().toISOString().slice(0,7);
const last=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth()+1,0).toISOString().slice(0,10)};
export const useCashFlow=()=>{
 const{user}=useBluAuth();
 const[transactions,setTransactions]=React.useState<CashFlowTransaction[]>([]);
 const[aux,setAux]=React.useState<any>({accounts:[],projects:[],centers:[],categories:[],clients:[],allocations:[]});
 const[filters,setFilters]=React.useState<CashFlowFilters>({search:'',from:`${month()}-01`,to:last(),status:'all',kind:'all',accountId:'',projectId:'',contractId:'',costCenterId:'',mode:'consolidated',groupBy:'daily'});
 const[loading,setLoading]=React.useState(true),[saving,setSaving]=React.useState(false),[error,setError]=React.useState(''),[success,setSuccess]=React.useState('');
 const context=React.useMemo(()=>({companyId:user?.companyId||'',userId:user?.id||''}),[user]);
 const reload=React.useCallback(async()=>{if(!context.companyId)return;setLoading(true);setError('');try{const data=await service.load(context);setTransactions(data.transactions);setAux(data.aux)}catch(reason){console.error(reason);setError('Não foi possível carregar o fluxo de caixa.')}finally{setLoading(false)}},[context]);
 React.useEffect(()=>{reload()},[reload]);
 const run=async(action:()=>Promise<unknown>,message:string)=>{setSaving(true);setError('');try{await action();setSuccess(message);await reload();setTimeout(()=>setSuccess(''),2500)}catch(reason:any){console.error(reason);setError(reason?.message||'Não foi possível concluir a operação.')}finally{setSaving(false)}};
 const filtered=service.filter(transactions,filters);
 return{transactions:filtered,allTransactions:transactions,aux,filters,setFilters,dashboard:service.dashboard(transactions,aux.accounts,filters),loading,saving,error,success,
  create:(value:CashFlowInput)=>run(()=>service.create(context,value),'Lançamento criado.'),
  settle:(item:CashFlowTransaction,amount:number,date:string,bank:string)=>run(()=>service.settle(context,item,amount,date,bank),'Baixa registrada.'),
  command:(id:string,action:'cancel'|'reverse'|'renegotiate'|'duplicate',reason:string)=>run(()=>service.command(context,id,action,reason),'Operação concluída.'),
  importRows:(rows:CashFlowInput[])=>run(()=>service.importRows(context,rows),'Importação concluída.'),
  allocate:(id:string,parts:any[])=>run(()=>service.allocate(context,id,parts),'Rateio registrado.')};
};
