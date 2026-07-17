export interface BluUser {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  companyName: string;
}

export interface DashboardMetric {
  label: string;
  value: string;
  change: string;
  tone: 'blue' | 'emerald' | 'amber' | 'rose';
}

export interface Deadline {
  id: string;
  type: string;
  title: string;
  date: string;
  time?: string;
  urgency: 'today' | 'soon' | 'normal';
}

export interface RecommendedOpportunity {
  id: string;
  agency: string;
  object: string;
  location: string;
  value: string;
  sessionDate: string;
  compatibility: number;
}

export interface DashboardData {
  metrics: DashboardMetric[];
  deadlines: Deadline[];
  opportunities: RecommendedOpportunity[];
  cashFlow: { month:string; expected:number; received:number; overdue:number }[];
  receivables: { agency:string; invoice:string; amount:string; due:string; status:'Em dia'|'Vencido'|'Previsto' }[];
  contractSummary: { active:number; expiring:number; total:string; balance:string; largest:string };
  commercial: { winRate:string; activePipeline:string; annualSales:string; topState:string };
  alerts: { title:string; detail:string; tone:'amber'|'rose'|'blue' }[];
}

export interface CompanyOnboarding {
  company: Record<string, string>;
  operation: Record<string, string>;
  goals: string[];
}
