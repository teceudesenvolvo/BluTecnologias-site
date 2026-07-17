import { MockDashboardRepository } from '../repositories/MockDashboardRepository';

const repository = new MockDashboardRepository();

export const dashboardService = {
  getSummary: (companyId: string) => repository.getSummary(companyId),
};
