import React from 'react';
import { useBluAuth } from '../../contexts/BluAuthContext';
import { FirebaseFinancialSettingsAdapter } from '../adapters/FirebaseFinancialSettingsAdapter';
import type { FinancialConfigurationInput, FinancialConfigurationRecord, FinancialSettingsAudit, FinancialSettingsSection } from '../domain/financialSettingsTypes';
import { FinancialSettingsService } from '../services/FinancialSettingsService';

const service=new FinancialSettingsService(new FirebaseFinancialSettingsAdapter());
export const useFinancialSettings=(section:FinancialSettingsSection)=>{
 const{user}=useBluAuth();const[items,setItems]=React.useState<FinancialConfigurationRecord[]>([]);const[audit,setAudit]=React.useState<FinancialSettingsAudit[]>([]);const[loading,setLoading]=React.useState(true);const[saving,setSaving]=React.useState(false);const[error,setError]=React.useState('');const[success,setSuccess]=React.useState('');
 const context=React.useMemo(()=>({companyId:user?.companyId||'',userId:user?.id||''}),[user]);
 const reload=React.useCallback(async()=>{if(!context.companyId)return;setLoading(true);setError('');try{const[data,history]=await Promise.all([service.load(context,section),service.audit(context).catch(()=>[])]);setItems(data);setAudit(history)}catch(reason){console.error(reason);setError('Não foi possível carregar as configurações financeiras.')}finally{setLoading(false)}},[context,section]);
 React.useEffect(()=>{reload()},[reload]);
 const run=async(action:()=>Promise<unknown>,message:string)=>{setSaving(true);setError('');try{await action();setSuccess(message);await reload();window.setTimeout(()=>setSuccess(''),2500)}catch(reason:any){console.error(reason);setError(reason?.message||'Não foi possível salvar a configuração.')}finally{setSaving(false)}};
 return{items,audit,loading,saving,error,success,reload,save:(value:FinancialConfigurationInput,id?:string)=>run(()=>service.save(context,section,value,id),'Configuração salva com sucesso.'),inactivate:(item:FinancialConfigurationRecord)=>run(()=>service.inactivate(context,section,item,item.id),'Configuração inativada.')};
};
