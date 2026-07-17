import type { DashboardData } from '../types';

export interface DashboardRepository {
  getSummary(companyId: string): Promise<DashboardData>;
}
