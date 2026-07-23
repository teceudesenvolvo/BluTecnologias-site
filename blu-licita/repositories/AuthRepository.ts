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
}

export interface AuthRepository {
  signIn(email: string, password: string): Promise<BluUser>;
  signInDemo(): Promise<BluUser>;
  createTrialAccount(input: TrialSignupInput): Promise<BluUser>;
  signOut(): Promise<void>;
}
