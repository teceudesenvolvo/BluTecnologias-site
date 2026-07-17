import type { DashboardRepository } from './DashboardRepository';
import { dashboardMock } from '../mocks/dashboard';

export class MockDashboardRepository implements DashboardRepository {
  async getSummary(_companyId: string) {
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    return dashboardMock;
  }
}
