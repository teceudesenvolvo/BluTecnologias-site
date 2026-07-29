import { httpsCallable } from 'firebase/functions';
import { functions } from '../../services/firebase';

export type BillingProviderConfig = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  environment: string;
  handle: string;
  accountId?: string;
  publicKey?: string;
  secretKey?: string;
  capabilities: string[];
  createdAt?: string;
  updatedAt?: string;
};

const call = httpsCallable(functions, 'mutateBillingProvider');

export const billingProviderAdminService = {
  async load(providerId = 'pagarme'): Promise<BillingProviderConfig> {
    const response = await call({ action: 'get', providerId });
    return (response.data as { provider?: BillingProviderConfig })?.provider || {
      id: providerId,
      name: 'Pagar.me',
      type: 'payment_gateway',
      enabled: false,
      environment: 'production',
      handle: '',
      accountId: '',
      publicKey: '',
      secretKey: '',
      capabilities: ['checkout_link', 'credit_card', 'debit_card', 'installments', 'webhook', 'payment_check', 'subscription'],
    };
  },
  async save(value: BillingProviderConfig) {
    const response = await call({ action: 'save', providerId: value.id || 'pagarme', value });
    return (response.data as { provider?: BillingProviderConfig })?.provider || value;
  },
};
