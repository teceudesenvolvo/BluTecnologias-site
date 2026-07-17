import type { FinancialConfigurationInput, FinancialSettingsSection } from '../domain/financialSettingsTypes';
import type { FinancialSettingsContext, FinancialSettingsRepository } from '../repositories/financialSettingsRepository';

export class FinancialSettingsService {
  constructor(private repository: FinancialSettingsRepository) {}
  load = (context:FinancialSettingsContext,section:FinancialSettingsSection)=>this.repository.list(context,section);
  audit = (context:FinancialSettingsContext)=>this.repository.listAudit(context);
  save(context:FinancialSettingsContext,section:FinancialSettingsSection,value:FinancialConfigurationInput,id?:string){
    if(!value.name.trim()) throw new Error('Informe um nome.');
    if(!Number.isInteger(value.order)||value.order<0) throw new Error('A ordem deve ser um número inteiro positivo.');
    return this.repository.mutate(context,id?'update':'create',section,value,id);
  }
  inactivate(context:FinancialSettingsContext,section:FinancialSettingsSection,value:FinancialConfigurationInput,id:string){
    return this.repository.mutate(context,'inactivate',section,{...value,status:'inactive'},id);
  }
}
