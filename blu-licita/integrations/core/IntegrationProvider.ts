export type IntegrationAvailability = 'PUBLIC_API' | 'PRIVATE_API' | 'PARTNER_API' | 'OPEN_DATA' | 'MANUAL_IMPORT' | 'UNDER_RESEARCH' | 'UNAVAILABLE';
export type AuthenticationType = 'NONE' | 'API_KEY' | 'OAUTH2' | 'BASIC' | 'CERTIFICATE' | 'CUSTOM' | 'UNKNOWN';

export interface IntegrationProvider {
  id: string; name: string; description: string; website?: string; documentationUrl?: string;
  availability: IntegrationAvailability; authenticationType: AuthenticationType;
  supportsOpportunities: boolean; supportsDocuments: boolean; supportsItems: boolean;
  supportsResults: boolean; supportsSuppliers: boolean; supportsContracts: boolean;
  supportsMinutes: boolean; supportsWebhooks: boolean; requiresCommercialAgreement: boolean;
  notes?: string;
}
