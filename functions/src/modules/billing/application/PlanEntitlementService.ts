import * as admin from 'firebase-admin';
import { BillingPlan, BillingPlanLimits } from '../domain/billingTypes';

type UsageSummary = {
  companiesCount: number;
  activeContractsCount: number;
  usersCount: number;
  storageBytesUsed: number;
  certificatesCount: number;
  bankAccountsCount: number;
  updatedAt: string;
};

const unlimited = (value: number | null | undefined) => value === null || value === undefined;
const activeContract = (status: unknown) => !['closed', 'cancelled', 'completed', 'encerrado', 'cancelado', 'concluído', 'concluido'].includes(String(status || '').toLowerCase());

export class PlanEntitlementService {
  constructor(private readonly db: admin.firestore.Firestore) {}

  async getUsageSummary(companyId: string, subscriptionId?: string): Promise<UsageSummary> {
    const [companies, users, clients, documents, bankAccounts] = await Promise.all([
      this.db.collection('companies').where('ownerCompanyId', '==', companyId).limit(1000).get().catch(() => null),
      this.db.collection('companyUsers').where('companyId', '==', companyId).limit(1000).get(),
      this.db.collection('clients').where('companyId', '==', companyId).limit(2000).get().catch(() => null),
      this.db.collection('certificates').where('companyId', '==', companyId).limit(5000).get().catch(() => null),
      this.db.collection('bankAccounts').where('companyId', '==', companyId).limit(1000).get().catch(() => null),
    ]);
    const clientRows = clients?.docs.map((doc) => doc.data()) || [];
    const contracts = clientRows.flatMap((client) => Array.isArray(client.contracts) ? client.contracts : []);
    const usage = {
      companiesCount: Math.max(1, companies?.size || 0),
      activeContractsCount: contracts.filter((contract) => activeContract((contract as {status?: unknown}).status)).length,
      usersCount: Math.max(1, users.size || 0),
      storageBytesUsed: documents?.docs.reduce((sum, doc) => sum + Number(doc.data().size || 0), 0) || 0,
      certificatesCount: documents?.size || 0,
      bankAccountsCount: bankAccounts?.docs.filter((doc) => doc.data().status !== 'inactive').length || 0,
      updatedAt: new Date().toISOString(),
    };
    if (subscriptionId) await this.db.collection('subscriptionUsage').doc(subscriptionId).set(usage, { merge: true });
    return usage;
  }

  canAddCompany(plan: BillingPlan, usage: UsageSummary) {
    return unlimited(plan.limits.companies) || usage.companiesCount < Number(plan.limits.companies);
  }

  canAddUser(plan: BillingPlan, usage: UsageSummary) {
    return unlimited(plan.limits.users) || usage.usersCount < Number(plan.limits.users);
  }

  canActivateContract(plan: BillingPlan, usage: UsageSummary) {
    return unlimited(plan.limits.activeContracts) || usage.activeContractsCount < Number(plan.limits.activeContracts);
  }

  canUploadDocument(plan: BillingPlan, usage: UsageSummary, incomingBytes = 0) {
    const storageBytes = plan.limits.storageBytes;
    return unlimited(storageBytes) || usage.storageBytesUsed + incomingBytes <= Number(storageBytes);
  }

  enforceEntitlements(plan: BillingPlan, usage: UsageSummary) {
    const limits: BillingPlanLimits = plan.limits;
    return {
      companies: unlimited(limits.companies) ? null : Math.max(0, Number(limits.companies) - usage.companiesCount),
      users: unlimited(limits.users) ? null : Math.max(0, Number(limits.users) - usage.usersCount),
      activeContracts: unlimited(limits.activeContracts) ? null : Math.max(0, Number(limits.activeContracts) - usage.activeContractsCount),
      storageBytes: unlimited(limits.storageBytes) ? null : Math.max(0, Number(limits.storageBytes) - usage.storageBytesUsed),
    };
  }

  validatePlanChange(targetPlan: BillingPlan, usage: UsageSummary) {
    const excesses: string[] = [];
    if (!unlimited(targetPlan.limits.companies) && usage.companiesCount > Number(targetPlan.limits.companies)) excesses.push('Empresas/CNPJs');
    if (!unlimited(targetPlan.limits.users) && usage.usersCount > Number(targetPlan.limits.users)) excesses.push('Usuários');
    if (!unlimited(targetPlan.limits.activeContracts) && usage.activeContractsCount > Number(targetPlan.limits.activeContracts)) excesses.push('Contratos ativos');
    if (!unlimited(targetPlan.limits.storageBytes) && usage.storageBytesUsed > Number(targetPlan.limits.storageBytes)) excesses.push('Armazenamento');
    return { allowed: excesses.length === 0, excesses };
  }
}
