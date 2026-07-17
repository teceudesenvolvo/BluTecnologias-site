import type { FinancialConfigurationInput, FinancialConfigurationRecord, FinancialSettingsAudit, FinancialSettingsSection } from '../domain/financialSettingsTypes';

export interface FinancialSettingsContext { companyId: string; userId: string }
export interface FinancialSettingsRepository {
  list(context: FinancialSettingsContext, section: FinancialSettingsSection): Promise<FinancialConfigurationRecord[]>;
  listAudit(context: FinancialSettingsContext): Promise<FinancialSettingsAudit[]>;
  mutate(context: FinancialSettingsContext, action: 'create'|'update'|'inactivate', section: FinancialSettingsSection, value: FinancialConfigurationInput, id?: string): Promise<string>;
}
