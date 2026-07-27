import type { BluUser } from '../types';
import type { PlanKey } from '../services/subscriptionPlanService';

export interface TrialSignupInput {
  plan: PlanKey;
  user: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  };
  company: {
    legalName: string;
    tradeName?: string;
    document: string;
    segment?: string;
    city?: string;
    state?: string;
  };
  goals?: string[];
  partnerCode?: string;
}

export interface PartnerSignupInput {
  partnerType: 'pf' | 'pj' | 'revendedor';
  user: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    document?: string;
    birthDate?: string;
  };
  company: {
    legalName?: string;
    tradeName?: string;
    document?: string;
    city?: string;
    state?: string;
    segment?: string;
    website?: string;
  };
  financial: {
    bankName?: string;
    agency?: string;
    accountNumber?: string;
    pixKey?: string;
    pixType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  };
  paymentProfile?: {
    gatewayFeePercent?: number;
    taxPercent?: number;
  };
  partnerCode?: string;
  acceptTerms: boolean;
}

export interface AuthRepository {
  signIn(email: string, password: string): Promise<BluUser>;
  signInDemo(): Promise<BluUser>;
  createTrialAccount(input: TrialSignupInput): Promise<BluUser>;
  createPartnerAccount(input: PartnerSignupInput): Promise<BluUser>;
  signOut(): Promise<void>;
}
