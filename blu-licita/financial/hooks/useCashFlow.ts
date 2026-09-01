import React from 'react';
import { useBluAuth } from '../../contexts/BluAuthContext';
import { FirebaseCashFlowAdapter } from '../adapters/FirebaseCashFlowAdapter';
import type { CashFlowFilters, CashFlowInput, CashFlowTransaction } from '../domain/cashFlowTypes';
import { CashFlowService } from '../services/CashFlowService';
import { useFinancialCompany } from '../contexts/FinancialCompanyContext';
const service=new CashFlowService(new FirebaseCashFlowAdapter());
const month=()=>new Date().toISOString().slice(0,7);
const last=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth()+1,0).toISOString().slice(0,10)};
export const useCashFlow=()=>{
 const{user}=useBluAuth();
 const{selectedCompanyId,selectedCompany}=useFinancialCompany();
 const[transactions,setTransactions]=React.useState<CashFlowTransaction[]>([]);
 const[aux,setAux]=React.useState<any>({accounts:[],projects:[],centers:[],categories:[],clients:[],allocations:[]});
 const[filters,setFilters]=React.useState<CashFlowFilters>({search:'',from:`${month()}-01`,to:last(),status:'all',kind:'all',accountId:'',projectId:'',contractId:'',costCenterId:'',mode:'consolidated',groupBy:'daily'});
 const[loading,setLoading]=React.useState(true),[saving,setSaving]=React.useState(false),[error,setError]=React.useState(''),[success,setSuccess]=React.useState('');
 const userId=user?.id||'';
 const mergeAux=React.useCallback((loaded:any[])=>({
  accounts:[...new Map(loaded.flatMap(item=>item.aux.accounts||[]).map((item:any)=>[item.id,item])).values()],
  projects:[...new Map(loaded.flatMap(item=>item.aux.projects||[]).map((item:any)=>[item.id,item])).values()],
  centers:[...new Map(loaded.flatMap(item=>item.aux.centers||[]).map((item:any)=>[item.id,item])).values()],
  categories:[...new Map(loaded.flatMap(item=>item.aux.categories||[]).map((item:any)=>[item.id,item])).values()],
 clients:[...new Map(loaded.flatMap(item=>item.aux.clients||[]).map((item:any)=>[item.id,item])).values()],
 allocations:[...new Map(loaded.flatMap(item=>item.aux.allocations||[]).map((item:any)=>[item.id,item])).values()],
 collections:[...new Map(loaded.flatMap(item=>(item.aux as any).collections||[]).map((item:any)=>[item.id,item])).values()],
 }),[]);
 const reload=React.useCallback(async()=>{
  const scope=user?.companyId?[user.companyId]:[];
  if(!scope.length||!userId){setTransactions([]);setAux({accounts:[],projects:[],centers:[],categories:[],clients:[],allocations:[]});setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const loaded=await Promise.all(scope.map(companyId=>service.load({companyId,userId})));
   const normalize=(value:any)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'').toLocaleLowerCase('pt-BR');
   const companyAliases=[selectedCompanyId,selectedCompany?.razaoSocial,selectedCompany?.nomeFantasia,selectedCompany?.cnpj].filter(Boolean).map(normalize);
   const collectionsById=new Map(loaded.flatMap(item=>(item.aux as any).collections||[]).map((item:any)=>[item.id,item]));
   const filterBySelectedCompany=(item:any)=>{
    if(!companyAliases.length) return true;
    const linkedCollection=collectionsById.get(item?.collectionId||item?.originId) as any;
    const candidates=[item?.companyName,item?.legalEntityId,item?.issuerCompanyId,item?.issuerCompanyName,item?.senderCompanyId,item?.senderCompany,item?.document,item?.cnpj,item?.holderName,item?.holderDocument,linkedCollection?.issuerCompanyId,linkedCollection?.issuerCompanyName].filter(Boolean).map(normalize);
    return candidates.some((candidate:string)=>companyAliases.includes(candidate));
   };
   const mergedTransactions=loaded.flatMap(item=>item.transactions).filter(filterBySelectedCompany);
   const mergedAux=mergeAux(loaded);
   setTransactions(mergedTransactions);
   setAux({
    ...mergedAux,
    accounts:(mergedAux.accounts||[]).filter(filterBySelectedCompany),
    projects:(mergedAux.projects||[]).filter(filterBySelectedCompany),
    centers:(mergedAux.centers||[]).filter(filterBySelectedCompany),
    clients:(mergedAux.clients||[]).filter(filterBySelectedCompany),
   });
  }catch(reason){console.error(reason);setError('Não foi possível carregar o fluxo de caixa.')}finally{setLoading(false)}
 },[mergeAux,selectedCompany?.cnpj,selectedCompany?.nomeFantasia,selectedCompany?.razaoSocial,selectedCompanyId,user?.companyId,userId]);
 React.useEffect(()=>{reload()},[reload]);
 const run=async(action:()=>Promise<unknown>,message:string)=>{setSaving(true);setError('');try{await action();setSuccess(message);await reload();setTimeout(()=>setSuccess(''),2500)}catch(reason:any){console.error(reason);setError(reason?.message||'Não foi possível concluir a operação.')}finally{setSaving(false)}};
 // companyId é sempre o tenant. A empresa emitente é uma dimensão financeira separada.
 const commandContext=React.useMemo(()=>({companyId:user?.companyId||'',userId}),[user?.companyId,userId]);
 const withIssuer=React.useCallback((value:CashFlowInput):CashFlowInput=>({
  ...value,
  issuerCompanyId:selectedCompanyId||value.issuerCompanyId||'',
  issuerCompanyName:selectedCompany?.razaoSocial||selectedCompany?.nomeFantasia||value.issuerCompanyName||'',
 }),[selectedCompany?.nomeFantasia,selectedCompany?.razaoSocial,selectedCompanyId]);
 const filtered=service.filter(transactions,filters);
 return{transactions:filtered,allTransactions:transactions,aux,filters,setFilters,dashboard:service.dashboard(transactions,aux.accounts,filters),loading,saving,error,success,
  create:(value:CashFlowInput)=>run(()=>service.create(commandContext,withIssuer(value)),'Lançamento criado.'),
  settle:(item:CashFlowTransaction,amount:number,date:string,bank:string)=>run(()=>service.settle(commandContext,item,amount,date,bank),'Baixa registrada.'),
  command:(id:string,action:'cancel'|'reverse'|'renegotiate'|'duplicate',reason:string)=>run(()=>service.command(commandContext,id,action,reason),'Operação concluída.'),
  importRows:(rows:CashFlowInput[])=>run(()=>service.importRows(commandContext,rows.map(withIssuer)),'Importação concluída.'),
  allocate:(id:string,parts:any[])=>run(()=>service.allocate(commandContext,id,parts),'Rateio registrado.')};
};
