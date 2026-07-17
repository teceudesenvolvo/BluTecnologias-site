import type { Company } from '../../services/firebase';
import { companySettingsService } from '../../services/firestoreSettingsService';

export const companyProfileService={
  async list():Promise<Company[]>{
    return companySettingsService.getAll();
  }
};
