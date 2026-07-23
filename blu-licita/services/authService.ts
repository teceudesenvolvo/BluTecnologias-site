import { FirebaseAuthRepository } from '../repositories/FirebaseAuthRepository';

const repository = new FirebaseAuthRepository();

export const authService = {
  signIn: (email: string, password: string) => repository.signIn(email, password),
  signInDemo: () => repository.signInDemo(),
  createTrialAccount: (input: Parameters<typeof repository.createTrialAccount>[0]) => repository.createTrialAccount(input),
  signOut: () => repository.signOut(),
};
