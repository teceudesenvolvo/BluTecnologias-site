export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'revoked';

export type PermissionAction = 'view' | 'export' | 'create' | 'edit' | 'delete' | 'issue' | 'cancel' | 'download' | 'downloadXml' | 'downloadPdf' | 'generate' | 'upload';
export type CompanyPermissionMap = Record<string, Partial<Record<PermissionAction, boolean>>>;

export interface CompanyMembership {
  id: string;
  userId: string;
  companyId: string;
  companyName: string;
  companyDocument?: string;
  accountId?: string;
  role: string;
  status: MembershipStatus;
  permissions: CompanyPermissionMap;
  externalProfessional?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountantIdentity {
  userId?: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  crc: string;
  crcState: string;
  crcNumber: string;
  avatarUrl?: string;
}

export const accountantPermissionPresets: Record<string, CompanyPermissionMap> = {
  fiscal: {
    accounting: { view: true }, fiscal: { view: true, export: true },
    invoices: { view: true, downloadXml: true, downloadPdf: true }, purchases: { view: true, export: true },
    suppliers: { view: true }, reports: { view: true, export: true }, accountingExports: { view: true, export: true },
  },
  fiscalFinance: {
    accounting: { view: true }, financial: { view: true, export: true }, fiscal: { view: true, export: true },
    invoices: { view: true, downloadXml: true, downloadPdf: true }, purchases: { view: true, export: true }, suppliers: { view: true },
    reports: { view: true, export: true }, cashFlow: { view: true, export: true }, dre: { view: true, export: true },
    accountingExports: { view: true, export: true, generate: true }, accountingDocuments: { view: true, create: true, upload: true, download: true },
    accountingRequests: { view: true, create: true, edit: true }, accountingObligations: { view: true, create: true, edit: true },
    accountingClosing: { view: true, create: true, edit: true }, accountingPending: { view: true, create: true, edit: true },
  },
  complete: {
    accounting: { view: true }, financial: { view: true, export: true }, fiscal: { view: true, export: true },
    invoices: { view: true, export: true, downloadXml: true, downloadPdf: true }, purchases: { view: true, export: true },
    suppliers: { view: true }, reports: { view: true, export: true }, cashFlow: { view: true, export: true }, dre: { view: true, export: true },
    stock: { view: true, export: true }, payroll: { view: true }, accountingExports: { view: true, export: true, generate: true },
    accountingDocuments: { view: true, export: true, create: true, edit: true, upload: true, download: true },
    accountingRequests: { view: true, create: true, edit: true }, accountingObligations: { view: true, create: true, edit: true },
    accountingClosing: { view: true, create: true, edit: true }, accountingPending: { view: true, create: true, edit: true },
  },
};

export const canMembership = (membership: CompanyMembership | null | undefined, module: string, action: PermissionAction) =>
  Boolean(membership?.status === 'active' && (membership.role === 'Administrador' || membership.permissions?.[module]?.[action]));
