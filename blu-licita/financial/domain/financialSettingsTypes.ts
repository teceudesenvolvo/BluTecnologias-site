export type FinancialSettingsSection =
  | 'categories' | 'paymentMethods' | 'collectionRules' | 'taxes'
  | 'approvals' | 'numbering' | 'permissions' | 'preferences'
  | 'integrations' | 'dre';

export type ConfigurationStatus = 'active' | 'inactive';

export interface FinancialConfigurationRecord {
  id: string;
  companyId: string;
  section: FinancialSettingsSection;
  name: string;
  code?: string;
  description?: string;
  status: ConfigurationStatus;
  order: number;
  data: Record<string, string | number | boolean | string[] | null>;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type FinancialConfigurationInput = Omit<FinancialConfigurationRecord,
  'id' | 'companyId' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>;

export interface FinancialSettingsAudit {
  id: string;
  action: 'create' | 'update' | 'inactivate' | 'reorder';
  entityType: FinancialSettingsSection;
  entityId: string;
  userId: string;
  createdAt: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export const sectionCollection: Record<FinancialSettingsSection, string> = {
  categories: 'financialCategories', approvals: 'financialApprovalFlows',
  dre: 'dreAccounts', paymentMethods: 'financialConfigurationItems',
  collectionRules: 'financialConfigurationItems', taxes: 'financialConfigurationItems',
  numbering: 'financialConfigurationItems', permissions: 'financialConfigurationItems',
  preferences: 'financialConfigurationItems', integrations: 'financialConfigurationItems',
};
