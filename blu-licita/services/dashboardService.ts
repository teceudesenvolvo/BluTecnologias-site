import { FirebaseDashboardRepository } from '../repositories/FirebaseDashboardRepository';

const repository = new FirebaseDashboardRepository();

export const dashboardService = {
  getSummary: (companyId: string) => repository.getSummary(companyId),
};
