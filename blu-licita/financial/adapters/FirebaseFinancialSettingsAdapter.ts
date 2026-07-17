import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../services/firebase';
import { sectionCollection, type FinancialConfigurationInput, type FinancialConfigurationRecord, type FinancialSettingsAudit, type FinancialSettingsSection } from '../domain/financialSettingsTypes';
import type { FinancialSettingsContext, FinancialSettingsRepository } from '../repositories/financialSettingsRepository';

const fromDoc = <T,>(item: {id:string;data():Record<string,unknown>}): T => ({id:item.id,...item.data()} as T);

export class FirebaseFinancialSettingsAdapter implements FinancialSettingsRepository {
  async list(context: FinancialSettingsContext, section: FinancialSettingsSection) {
    const constraints = [where('companyId','==',context.companyId)];
    if (sectionCollection[section] === 'financialConfigurationItems') constraints.push(where('section','==',section));
    const snapshot = await getDocs(query(collection(db, sectionCollection[section]), ...constraints));
    return snapshot.docs.map(item=>fromDoc<FinancialConfigurationRecord>(item)).sort((a,b)=>(a.order||0)-(b.order||0));
  }
  async listAudit(context: FinancialSettingsContext) {
    const snapshot = await getDocs(query(collection(db,'financialAuditLogs'),where('companyId','==',context.companyId),orderBy('createdAt','desc'),limit(30)));
    return snapshot.docs.map(item=>fromDoc<FinancialSettingsAudit>(item));
  }
  async mutate(_context: FinancialSettingsContext, action: 'create'|'update'|'inactivate', section: FinancialSettingsSection, value: FinancialConfigurationInput, id?: string) {
    const command = httpsCallable(functions,'mutateFinancialConfiguration');
    const response = await command({action,section,id,value});
    return String((response.data as {id:string}).id);
  }
}
