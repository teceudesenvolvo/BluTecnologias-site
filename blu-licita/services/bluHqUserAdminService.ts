import { httpsCallable } from 'firebase/functions';
import { functions } from '../../services/firebase';

const call = httpsCallable(functions, 'deleteBluHqUser');

export const bluHqUserAdminService = {
  async delete(userId: string) {
    const response = await call({ userId });
    return response.data as { userId: string; deletedCollections: string[] };
  },
};
