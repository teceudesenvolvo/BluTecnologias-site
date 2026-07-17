import type { BluUser } from '../types';

export interface AuthRepository {
  signIn(email: string, password: string): Promise<BluUser>;
  signInDemo(): Promise<BluUser>;
  signOut(): Promise<void>;
}
