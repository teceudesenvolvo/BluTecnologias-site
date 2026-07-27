import { FirebaseAuthRepository } from '../repositories/FirebaseAuthRepository';

const repository = new FirebaseAuthRepository();

export const authService = {
  signIn: (email: string, password: string) => repository.signIn(email, password),
  signInDemo: () => repository.signInDemo(),
  createTrialAccount: (input: Parameters<typeof repository.createTrialAccount>[0]) => repository.createTrialAccount(input),
  createPartnerAccount: (input: Parameters<typeof repository.createPartnerAccount>[0]) => repository.createPartnerAccount(input),
  signOut: () => repository.signOut(),
};
